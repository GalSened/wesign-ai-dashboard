"""
WeSign AI Assistant Orchestrator
FastAPI service with AutoGen multi-agent system for WeSign operations
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import os
import tempfile
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import secrets
from openai import OpenAI

# Load environment variables from .env file
# override=True ensures .env values take precedence over existing environment variables
load_dotenv(override=True)

# CRITICAL FIX: Explicitly set OPENAI_API_KEY in os.environ for Uvicorn worker processes
# Uvicorn's auto-reload mode spawns worker processes that inherit the parent environment
# We must explicitly set the environment variable AFTER load_dotenv() to ensure workers get it
api_key_from_dotenv = os.getenv("OPENAI_API_KEY")
if api_key_from_dotenv:
    os.environ["OPENAI_API_KEY"] = api_key_from_dotenv
    print(f"[STARTUP] Explicitly set OPENAI_API_KEY in environment: {api_key_from_dotenv[:20]}...")

from orchestrator_new import WeSignOrchestrator
from chatkit_store import InMemoryStore
from chatkit_server import WeSignChatKitServer

# Configure logging with DEBUG level to capture all details
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('orchestrator.log')
    ]
)
logger = logging.getLogger(__name__)
logger.info("=" * 100)
logger.info("🚀 MAIN.PY STARTING - IMPORTS orchestrator_new.py")
logger.info("=" * 100)

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

# Mount static files for frontend
frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

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
chatkit_server: Optional[WeSignChatKitServer] = None
chatkit_store: Optional[InMemoryStore] = None
temp_files: Dict[str, str] = {}  # fileId -> file path mapping
session_tokens: Dict[str, Dict[str, Any]] = {}  # token -> session data

@app.on_event("startup")
async def startup_event():
    """Initialize orchestrator with native MCP support"""
    global orchestrator, chatkit_store, chatkit_server

    logger.info("🚀 Starting WeSign AI Assistant Orchestrator...")
    logger.info("📦 Using native AutoGen MCP integration")

    # Initialize orchestrator (it handles MCP internally now)
    logger.info("Initializing AutoGen agents with native MCP...")
    orchestrator = WeSignOrchestrator()
    await orchestrator.initialize()

    # Initialize ChatKit store and server
    logger.info("Initializing ChatKit server...")
    chatkit_store = InMemoryStore()
    chatkit_server = WeSignChatKitServer(chatkit_store, orchestrator)
    logger.info("✅ ChatKit server initialized")

    logger.info("✅ Orchestrator ready with native MCP support!")

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
    """Root endpoint - redirect to login"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/login")

@app.get("/login")
async def serve_login():
    """Serve WeSign login page"""
    login_path = Path(__file__).parent.parent / "frontend" / "login.html"
    if login_path.exists():
        return FileResponse(login_path)
    raise HTTPException(status_code=404, detail="Login page not found")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    agent_status = orchestrator.get_agent_status() if orchestrator else {}

    return {
        "status": "healthy",
        "mcp_integration": "native_autogen",
        "agents": agent_status,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/ui")
@app.get("/chatkit")
async def serve_ui():
    """Serve WeSign ChatKit UI (custom implementation with voice support)"""
    ui_path = Path(__file__).parent.parent / "frontend" / "chatkit-custom.html"
    if ui_path.exists():
        return FileResponse(ui_path)
    raise HTTPException(status_code=404, detail="ChatKit UI not found")

@app.get("/official-chatkit.html")
async def serve_official_ui():
    """Serve Official OpenAI ChatKit UI (experimental)"""
    ui_path = Path(__file__).parent.parent / "frontend" / "official-chatkit.html"
    if ui_path.exists():
        return FileResponse(ui_path)
    raise HTTPException(status_code=404, detail="Official ChatKit UI not found")

@app.get("/chatkit-index.html")
async def serve_legacy_ui():
    """Serve legacy custom ChatKit UI (deprecated)"""
    ui_path = Path(__file__).parent.parent / "frontend" / "chatkit-index.html"
    if ui_path.exists():
        return FileResponse(ui_path)
    raise HTTPException(status_code=404, detail="Legacy UI not found")

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

@app.post("/api/wesign-login")
async def wesign_login(request: Request):
    """
    WeSign authentication endpoint

    Authenticates user with WeSign via MCP server and returns auth token
    """
    try:
        data = await request.json()

        email = data.get("email")
        password = data.get("password")
        persistent = data.get("persistent", False)

        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")

        logger.info(f"🔐 WeSign login attempt for: {email}")

        # Call WeSign MCP server login
        wesign_url = os.getenv("WESIGN_MCP_URL", "http://localhost:3000")
        login_response = await orchestrator.wesign_client._http_client.post(
            f"{wesign_url}/execute",
            json={
                "tool": "wesign_login",
                "parameters": {
                    "email": email,
                    "password": password,
                    "persistent": persistent
                }
            }
        )

        login_data = login_response.json()

        if not login_data.get("success"):
            error_msg = login_data.get("error", "Login failed")
            logger.error(f"❌ WeSign login failed: {error_msg}")
            raise HTTPException(status_code=401, detail=error_msg)

        # Generate auth token for our session
        auth_token = secrets.token_urlsafe(32)

        # Store auth session
        session_tokens[auth_token] = {
            "email": email,
            "user_name": email.split('@')[0],  # Use email prefix as name
            "authenticated": True,
            "wesign_session": login_data.get("data"),
            "created_at": datetime.utcnow().isoformat()
        }

        logger.info(f"✅ WeSign login successful for {email}")

        return {
            "success": True,
            "authToken": auth_token,
            "user": {
                "email": email,
                "name": email.split('@')[0]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {str(e)}", exc_info=True)
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
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    try:
        # Get tools from orchestrator's MCP integration
        agent_status = orchestrator.get_agent_status()
        mcp_tools = agent_status.get("mcp_tools", {})

        # Count total tools
        total_tools = sum(mcp_tools.values())

        return {
            "count": total_tools,
            "categories": mcp_tools,
            "integration": "native_autogen_mcp"
        }
    except Exception as e:
        logger.error(f"List tools error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chatkit")
async def chatkit_endpoint(request: Request):
    """
    ChatKit communication endpoint

    This handles all ChatKit UI communication, streaming responses back
    to the frontend via Server-Sent Events (SSE) or JSON.

    Authentication: Expects client_secret token from ChatKit session
    """
    if not chatkit_server:
        raise HTTPException(status_code=503, detail="ChatKit server not initialized")

    try:
        # Get request body
        body = await request.body()

        # Extract authentication from headers or body
        # ChatKit may send the token in various ways
        auth_header = request.headers.get("Authorization", "")
        client_secret = None

        # Try to extract token from Authorization header
        if auth_header.startswith("Bearer "):
            client_secret = auth_header.replace("Bearer ", "")

        # Get user context from session token
        user_context = {}
        if client_secret and client_secret in session_tokens:
            session_data = session_tokens[client_secret]
            user_context = {
                "user_id": session_data.get("user_id", "demo-user"),
                "company_id": session_data.get("company_id", "demo-company"),
                "user_name": session_data.get("user_name", "User")
            }
            logger.info(f"🔐 Authenticated ChatKit request for {user_context['user_name']}")
        else:
            # Fall back to headers or defaults
            user_context = {
                "user_id": request.headers.get("X-User-ID", "demo-user"),
                "company_id": request.headers.get("X-Company-ID", "demo-company"),
                "user_name": request.headers.get("X-User-Name", "User")
            }
            logger.warning("⚠️ ChatKit request without valid session token, using defaults")

        # Process through ChatKit server
        # This will handle the message, route to appropriate agent,
        # and stream back events
        result = await chatkit_server.process(body, user_context)

        # Check if result is streaming or direct response
        if hasattr(result, '__aiter__'):
            # Streaming response (SSE)
            return StreamingResponse(
                result,
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"  # Disable nginx buffering
                }
            )
        else:
            # Direct JSON response
            return Response(
                content=result.json if hasattr(result, 'json') else result,
                media_type="application/json"
            )

    except Exception as e:
        logger.error(f"ChatKit endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/create-session")
async def create_session(request: Request):
    """
    Create ChatKit session with authentication

    Returns a session token for ChatKit client initialization.
    This token authenticates the user and associates their WeSign
    credentials with the ChatKit session.
    """
    try:
        # Parse request body
        data = await request.json()

        # Extract user context
        user_id = data.get("userId", "demo-user")
        company_id = data.get("companyId", "demo-company")
        user_name = data.get("userName", "User")

        # Generate secure session token
        session_token = secrets.token_urlsafe(32)

        # Store session data
        session_tokens[session_token] = {
            "user_id": user_id,
            "company_id": company_id,
            "user_name": user_name,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": None  # No expiration for demo
        }

        logger.info(f"🎫 Created ChatKit session for {user_name}")

        return {
            "success": True,
            "sessionToken": session_token,
            "user": {
                "id": user_id,
                "name": user_name,
                "companyId": company_id
            }
        }

    except Exception as e:
        logger.error(f"Session creation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chatkit/session")
@app.post("/api/chatkit-client-token")
async def create_chatkit_session(request: Request):
    """
    Create ChatKit session and generate client token for authentication

    This endpoint supports both:
    - /api/chatkit/session (official ChatKit API path)
    - /api/chatkit-client-token (legacy path for backward compatibility)

    ChatKit uses short-lived client tokens for authentication.
    The client uses this token to authenticate with our custom ChatKit server.
    """
    try:
        # Parse request body
        data = await request.json()

        # Extract user context
        user_id = data.get("userId", "demo-user")
        company_id = data.get("companyId", "demo-company")
        user_name = data.get("userName", "Demo User")

        # Generate client token (32-byte URL-safe base64)
        client_secret = secrets.token_urlsafe(32)

        # Store token with user context for our ChatKit endpoint
        session_tokens[client_secret] = {
            "user_id": user_id,
            "company_id": company_id,
            "user_name": user_name,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": None  # No expiration for demo
        }

        logger.info(f"🔑 Created ChatKit session for {user_name}")

        return {
            "client_secret": client_secret,
            "session_id": client_secret,  # For compatibility
            "user": {
                "id": user_id,
                "name": user_name,
                "companyId": company_id
            }
        }

    except Exception as e:
        logger.error(f"ChatKit session creation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chatkit-status")
async def chatkit_status():
    """Get ChatKit server status and statistics"""
    if not chatkit_server:
        return {"status": "not_initialized"}

    try:
        status = chatkit_server.get_server_status()
        return {
            "status": "operational",
            "chatkit": status,
            "sessions": len(session_tokens)
        }
    except Exception as e:
        logger.error(f"Status error: {e}")
        return {"status": "error", "error": str(e)}

@app.post("/api/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Speech-to-text transcription using OpenAI Whisper API

    Accepts audio file upload and returns transcribed text.
    Supports various audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm.
    """
    try:
        logger.info(f"🎤 Transcription request: {file.filename} ({file.content_type})")

        # Validate file type
        allowed_types = [
            'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/mpeg',
            'audio/mpga', 'audio/m4a', 'audio/wav', 'audio/webm',
            'audio/x-wav', 'audio/wave'
        ]

        if file.content_type not in allowed_types:
            logger.warning(f"⚠️ Unsupported audio type: {file.content_type}")
            # Still try to process it as Whisper is flexible

        # Read audio file
        audio_data = await file.read()
        file_size = len(audio_data)
        logger.info(f"📊 Audio file size: {file_size} bytes")

        # Check file size (Whisper API has 25MB limit)
        if file_size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Audio file too large. Maximum size is 25MB."
            )

        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail="Audio file is empty."
            )

        # Save temporarily for OpenAI API
        temp_dir = tempfile.gettempdir()
        wesign_temp = Path(temp_dir) / "wesign-assistant"
        wesign_temp.mkdir(exist_ok=True)

        # Determine file extension
        file_ext = Path(file.filename).suffix if file.filename else '.wav'
        if not file_ext:
            file_ext = '.wav'

        temp_file = wesign_temp / f"audio-{datetime.now().timestamp()}{file_ext}"

        # Write audio data
        with open(temp_file, 'wb') as f:
            f.write(audio_data)

        logger.info(f"💾 Saved temp file: {temp_file}")

        try:
            # Initialize OpenAI client
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

            # Call Whisper API
            logger.info("🔄 Calling OpenAI Whisper API...")
            with open(temp_file, 'rb') as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )

            logger.info(f"✅ Transcription successful: {transcript[:100]}...")

            return {
                "text": transcript,
                "filename": file.filename,
                "size": file_size
            }

        finally:
            # Clean up temp file
            try:
                os.remove(temp_file)
                logger.info(f"🗑️ Cleaned up temp file: {temp_file}")
            except Exception as cleanup_error:
                logger.warning(f"⚠️ Failed to clean up temp file: {cleanup_error}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Transcription error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn

    host = "0.0.0.0"  # Hardcoded for testing
    port = 8002  # Hardcoded to port 8002 for testing

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
