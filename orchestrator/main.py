"""
WeSign AI Assistant Orchestrator
FastAPI service with AutoGen multi-agent system for WeSign operations
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import os
import tempfile
from pathlib import Path
from datetime import datetime

from orchestrator import WeSignOrchestrator
from mcp_client import MCPClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="WeSign AI Assistant Orchestrator",
    description="Multi-agent system for WeSign document signing workflows",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatContext(BaseModel):
    userId: str
    companyId: str
    userName: str
    conversationId: Optional[str] = None

class FileInfo(BaseModel):
    fileId: str
    fileName: str
    filePath: str

class ChatRequest(BaseModel):
    message: str
    context: ChatContext
    files: Optional[List[FileInfo]] = None

class ToolCall(BaseModel):
    tool: str
    action: str
    parameters: Optional[Dict[str, Any]] = None
    result: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversationId: str
    toolCalls: Optional[List[ToolCall]] = None
    metadata: Optional[Dict[str, Any]] = None

# Global state
orchestrator: Optional[WeSignOrchestrator] = None
mcp_client: Optional[MCPClient] = None
temp_files: Dict[str, str] = {}  # fileId -> file path mapping

@app.on_event("startup")
async def startup_event():
    """Initialize orchestrator and MCP client on startup"""
    global orchestrator, mcp_client

    logger.info("🚀 Starting WeSign AI Assistant Orchestrator...")

    # Initialize MCP client
    mcp_url = os.getenv("WESIGN_MCP_URL", "http://localhost:3000")
    logger.info(f"Connecting to WeSign MCP server at {mcp_url}")

    mcp_client = MCPClient(mcp_url)

    # Test MCP connection
    try:
        tools = await mcp_client.list_tools()
        logger.info(f"✅ Connected to MCP server. {tools.get('count', 0)} tools available")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MCP server: {e}")
        logger.warning("Continuing without MCP connection...")

    # Auto-login to WeSign if credentials provided
    wesign_email = os.getenv("WESIGN_EMAIL")
    wesign_password = os.getenv("WESIGN_PASSWORD")

    if wesign_email and wesign_password:
        logger.info(f"🔐 Attempting auto-login to WeSign as {wesign_email}...")
        try:
            login_result = await mcp_client.login(
                email=wesign_email,
                password=wesign_password,
                persistent=True
            )
            if login_result.get("success"):
                logger.info("✅ Successfully logged in to WeSign")
                # Get user info
                user_info = await mcp_client.get_user_info()
                if user_info.get("success"):
                    logger.info(f"👤 Logged in as: {user_info.get('data', {}).get('name', 'User')}")
            else:
                logger.warning(f"⚠️ WeSign login failed: {login_result.get('error')}")
        except Exception as e:
            logger.error(f"❌ Auto-login error: {e}")
    else:
        logger.info("ℹ️ No WeSign credentials configured - skipping auto-login")

    # Initialize orchestrator
    logger.info("Initializing AutoGen agents...")
    orchestrator = WeSignOrchestrator(mcp_client)
    await orchestrator.initialize()

    logger.info("✅ Orchestrator ready!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    # Clean up temporary files
    for file_path in temp_files.values():
        try:
            os.remove(file_path)
        except:
            pass

    logger.info("👋 Orchestrator shutting down")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "WeSign AI Assistant Orchestrator",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "mcp_connected": mcp_client is not None if mcp_client else False
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    agent_status = orchestrator.get_agent_status() if orchestrator else {}

    return {
        "status": "healthy",
        "mcp_connected": mcp_client is not None if mcp_client else False,
        "agents": agent_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload file endpoint
    Saves file temporarily for agent processing
    """
    try:
        # Create temp directory if not exists
        temp_dir = tempfile.gettempdir()
        wesign_temp = Path(temp_dir) / "wesign-assistant"
        wesign_temp.mkdir(exist_ok=True)

        # Generate unique file ID
        file_id = f"file-{datetime.now().timestamp()}"
        file_path = wesign_temp / f"{file_id}-{file.filename}"

        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Store in mapping
        temp_files[file_id] = str(file_path)

        logger.info(f"📄 File uploaded: {file.filename} ({len(content)} bytes)")

        return {
            "fileId": file_id,
            "fileName": file.filename,
            "filePath": str(file_path),
            "size": len(content)
        }

    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint
    Processes messages through AutoGen orchestrator
    """
    if not orchestrator:
        raise HTTPException(
            status_code=503,
            detail="Orchestrator not initialized"
        )

    try:
        logger.info(f"💬 Chat request from {request.context.userName}: {request.message[:50]}...")

        # Prepare file paths for agents
        file_paths = []
        if request.files:
            for file_info in request.files:
                if file_info.fileId in temp_files:
                    file_paths.append({
                        "fileName": file_info.fileName,
                        "filePath": temp_files[file_info.fileId]
                    })

        # Process through orchestrator
        result = await orchestrator.process_message(
            message=request.message,
            user_id=request.context.userId,
            company_id=request.context.companyId,
            user_name=request.context.userName,
            conversation_id=request.context.conversationId,
            files=file_paths
        )

        # Convert tool calls
        tool_calls = []
        if result.get("tool_calls"):
            for tc in result["tool_calls"]:
                tool_calls.append(ToolCall(
                    tool=tc.get("tool", ""),
                    action=tc.get("action", ""),
                    parameters=tc.get("parameters"),
                    result=tc.get("result")
                ))

        return ChatResponse(
            response=result["response"],
            conversationId=result["conversation_id"],
            toolCalls=tool_calls if tool_calls else None,
            metadata=result.get("metadata")
        )

    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tools")
async def list_tools():
    """List all available MCP tools"""
    if not mcp_client:
        raise HTTPException(status_code=503, detail="MCP client not initialized")

    try:
        tools = await mcp_client.list_tools()
        return tools
    except Exception as e:
        logger.error(f"List tools error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
