"""
WeSign Orchestrator with Native AutoGen MCP Integration
Uses autogen_ext.tools.mcp for native MCP protocol support
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.base import Response
from autogen_agentchat.messages import TextMessage
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_ext.tools.mcp import StdioServerParams, mcp_server_tools
from autogen_core import CancellationToken

logger = logging.getLogger(__name__)


class WeSignOrchestrator:
    """Orchestrator managing AutoGen agents with native MCP integration"""

    def __init__(self):
        """Initialize orchestrator with MCP servers"""
        self.agents = {}
        self.conversations = {}  # Store conversation history by conversation_id
        self.mcp_tools = {}  # Store MCP tools by category

        # Model client configuration
        self.model_client = OpenAIChatCompletionClient(
            model="gpt-4",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7,
        )

    async def initialize(self):
        """Initialize all agents and MCP servers"""
        logger.info("🤖 Initializing AutoGen agents with native MCP...")

        # Initialize MCP tools
        await self._init_mcp_servers()

        # Create specialized agents
        await self._create_document_agent()
        await self._create_signing_agent()
        await self._create_template_agent()
        await self._create_admin_agent()
        await self._create_filesystem_agent()

        logger.info(f"✅ Initialized {len(self.agents)} agents with {len(self.mcp_tools)} MCP tool categories")

    async def _init_mcp_servers(self):
        """Initialize MCP servers and load tools"""
        try:
            # WeSign MCP Server (HTTP-based)
            # Note: WeSign MCP currently has HTTP 500 issues, but we'll keep it for when it's fixed
            logger.info("🔧 Initializing WeSign MCP server...")

            # For now, we'll use a placeholder since WeSign MCP has HTTP issues
            # When the MCP server is fixed, we can add:
            # wesign_params = HttpServerParams(url="http://localhost:3000")
            # self.mcp_tools["wesign"] = await mcp_server_tools(wesign_params)

            self.mcp_tools["wesign"] = []  # Placeholder until MCP server is fixed
            logger.info(f"📋 WeSign MCP: {len(self.mcp_tools['wesign'])} tools (server has issues)")

            # FileSystem MCP Server (stdio-based)
            logger.info("🗂️  Initializing FileSystem MCP server...")
            allowed_dirs = os.getenv(
                "FILESYSTEM_ALLOWED_DIRS",
                f"{Path.home()}/Documents,{Path.home()}/Downloads,/tmp/wesign-assistant"
            ).split(",")

            filesystem_params = StdioServerParams(
                command="npx",
                args=["-y", "@modelcontextprotocol/server-filesystem"] + allowed_dirs
            )

            self.mcp_tools["filesystem"] = await mcp_server_tools(filesystem_params)
            logger.info(f"✅ FileSystem MCP: {len(self.mcp_tools['filesystem'])} tools available")
            logger.info(f"📁 Allowed directories: {allowed_dirs}")

        except Exception as e:
            logger.error(f"❌ Error initializing MCP servers: {e}", exc_info=True)
            # Continue without MCP tools
            self.mcp_tools = {"wesign": [], "filesystem": []}

    async def _create_document_agent(self):
        """Agent specialized in document operations"""
        tools = self.mcp_tools.get("wesign", [])

        self.agents["document"] = AssistantAgent(
            name="DocumentAgent",
            description="Specialist in document management for WeSign",
            system_message="""You are a document management specialist for WeSign.
            Your responsibilities:
            - Upload documents to WeSign
            - List and search user documents
            - Retrieve document information
            - Manage document collections

            When users ask about documents, provide clear information and help them manage their documents.
            Always confirm actions before executing them.
            """,
            model_client=self.model_client,
            tools=tools,
        )

    async def _create_signing_agent(self):
        """Agent specialized in signing workflows"""
        tools = self.mcp_tools.get("wesign", [])

        self.agents["signing"] = AssistantAgent(
            name="SigningAgent",
            description="Specialist in digital signature workflows for WeSign",
            system_message="""You are a digital signature specialist for WeSign.
            Your responsibilities:
            - Create self-signing documents
            - Add signature fields to documents
            - Complete signing processes
            - Save signed documents

            Guide users through the signing process step by step.
            Explain what signature fields are needed and where they should be placed.
            """,
            model_client=self.model_client,
            tools=tools,
        )

    async def _create_template_agent(self):
        """Agent specialized in template operations"""
        tools = self.mcp_tools.get("wesign", [])

        self.agents["template"] = AssistantAgent(
            name="TemplateAgent",
            description="Specialist in template management for WeSign",
            system_message="""You are a template management specialist for WeSign.
            Your responsibilities:
            - List available templates
            - Create new templates from documents
            - Use templates to create documents

            Help users understand templates and how they can speed up their workflow.
            """,
            model_client=self.model_client,
            tools=tools,
        )

    async def _create_admin_agent(self):
        """Agent specialized in administrative tasks"""
        self.agents["admin"] = AssistantAgent(
            name="AdminAgent",
            description="Administrative assistant for WeSign",
            system_message="""You are an administrative assistant for WeSign.
            Your responsibilities:
            - Check authentication status
            - Retrieve user information
            - Handle login/logout operations
            - Provide general help and guidance

            Be friendly and helpful. Guide users to the right specialist agent when needed.
            """,
            model_client=self.model_client,
            tools=[],  # Admin agent doesn't need MCP tools
        )

    async def _create_filesystem_agent(self):
        """Agent specialized in file system operations"""
        tools = self.mcp_tools.get("filesystem", [])

        self.agents["filesystem"] = AssistantAgent(
            name="FileSystemAgent",
            description="Specialist in file system operations for WeSign",
            system_message="""You are a file system specialist for WeSign.
            Your responsibilities:
            - List files in allowed directories
            - Read file contents
            - Help users browse their files
            - Upload files to WeSign for document processing

            Only access directories that have been explicitly allowed.
            Always confirm file paths with users before operations.
            Help users locate and select files for signing workflows.
            """,
            model_client=self.model_client,
            tools=tools,
        )

    async def process_message(
        self,
        message: str,
        user_id: str,
        company_id: str,
        user_name: str,
        conversation_id: Optional[str] = None,
        files: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Process user message through agent system with native MCP

        Args:
            message: User message
            user_id: User ID
            company_id: Company ID
            user_name: User name
            conversation_id: Optional conversation ID for context
            files: Optional list of file info dicts with fileName and filePath

        Returns:
            Response dict with message, conversation_id, tool_calls, metadata
        """
        try:
            # Generate conversation ID if not provided
            if not conversation_id:
                conversation_id = f"conv-{user_id}-{datetime.now().timestamp()}"

            logger.info(f"💬 Processing message in conversation: {conversation_id}")

            # Add file context to message if files provided
            full_message = message
            if files and len(files) > 0:
                file_info = "\n\nAttached files:\n"
                for f in files:
                    file_info += f"- {f['fileName']} (at {f['filePath']})\n"
                full_message = message + file_info

            # Determine which agent should handle this
            agent_choice = self._select_agent(full_message)
            logger.info(f"🎯 Selected agent: {agent_choice}")

            # Get the selected agent
            agent = self.agents[agent_choice]

            # Initialize conversation history
            if conversation_id not in self.conversations:
                self.conversations[conversation_id] = []

            # Run the agent (single-turn pattern - no auto-reply)
            cancellation_token = CancellationToken()

            logger.info(f"🤖 Running {agent_choice} agent...")
            result: Response = await agent.run(
                task=full_message,
                cancellation_token=cancellation_token
            )

            # Extract response
            response_text = self._extract_response(result)
            tool_calls = self._extract_tool_calls(result)

            # Store conversation
            self.conversations[conversation_id].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.utcnow().isoformat()
            })
            self.conversations[conversation_id].append({
                "role": "assistant",
                "content": response_text,
                "tool_calls": tool_calls,
                "timestamp": datetime.utcnow().isoformat()
            })

            return {
                "response": response_text,
                "conversation_id": conversation_id,
                "tool_calls": tool_calls,
                "metadata": {
                    "agent": agent_choice,
                    "user_name": user_name,
                    "files_count": len(files) if files else 0
                }
            }

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            return {
                "response": f"I encountered an error: {str(e)}. Please try again.",
                "conversation_id": conversation_id or f"conv-{user_id}-{datetime.now().timestamp()}",
                "tool_calls": [],
                "metadata": {"error": str(e)}
            }

    def _select_agent(self, message: str) -> str:
        """
        Select appropriate agent based on message content

        Args:
            message: User message

        Returns:
            Agent name key
        """
        message_lower = message.lower()

        # FileSystem-related keywords (new!)
        if any(word in message_lower for word in ["file", "browse", "select file", "read file", "list files", "show files"]):
            if "filesystem" in self.agents:
                return "filesystem"

        # Signing-related keywords
        if any(word in message_lower for word in ["sign", "signature", "signing", "sign document", "add signature"]):
            return "signing"

        # Template-related keywords
        if any(word in message_lower for word in ["template", "templates", "use template", "create template"]):
            return "template"

        # Document-related keywords
        if any(word in message_lower for word in ["upload", "document", "documents", "pdf", "list documents"]):
            return "document"

        # Default to admin for general queries
        return "admin"

    def _extract_response(self, result: Response) -> str:
        """
        Extract human-readable response from AutoGen response

        Args:
            result: AutoGen Response object

        Returns:
            Response text
        """
        try:
            # Check if result has messages
            if hasattr(result, 'messages') and result.messages:
                # Get the last message
                last_message = result.messages[-1]

                # Handle TextMessage
                if isinstance(last_message, TextMessage):
                    return last_message.content

                # Handle dict
                if isinstance(last_message, dict) and 'content' in last_message:
                    return last_message['content']

                # Fallback to string
                return str(last_message)

            # Fallback
            return "Task completed successfully."

        except Exception as e:
            logger.error(f"Error extracting response: {e}")
            return "I've processed your request."

    def _extract_tool_calls(self, result: Response) -> List[Dict[str, Any]]:
        """
        Extract tool calls from AutoGen response

        Args:
            result: AutoGen Response object

        Returns:
            List of tool call dicts
        """
        tool_calls = []

        try:
            if hasattr(result, 'messages'):
                for message in result.messages:
                    # Check for tool calls in message
                    if hasattr(message, 'function_call'):
                        func_call = message.function_call
                        tool_calls.append({
                            "tool": func_call.get('name', 'unknown'),
                            "action": "execute",
                            "parameters": func_call.get('arguments', {}),
                            "result": "completed"
                        })

        except Exception as e:
            logger.error(f"Error extracting tool calls: {e}")

        return tool_calls

    def get_agent_status(self) -> Dict[str, Any]:
        """
        Get status of all agents

        Returns:
            Dict with agent status information
        """
        return {
            "total_agents": len(self.agents),
            "agents": list(self.agents.keys()),
            "conversations": len(self.conversations),
            "mcp_tools": {
                category: len(tools)
                for category, tools in self.mcp_tools.items()
            }
        }

    def get_conversation_history(self, conversation_id: str) -> List[Dict[str, Any]]:
        """
        Get conversation history

        Args:
            conversation_id: Conversation ID

        Returns:
            List of conversation messages
        """
        return self.conversations.get(conversation_id, [])
