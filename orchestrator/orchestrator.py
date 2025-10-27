"""
WeSign Orchestrator with AutoGen Multi-Agent System
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

import autogen
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

logger = logging.getLogger(__name__)


class WeSignOrchestrator:
    """Orchestrator managing AutoGen agents for WeSign operations"""

    def __init__(self, mcp_client):
        """
        Initialize orchestrator with MCP client

        Args:
            mcp_client: MCPClient instance for WeSign operations
        """
        self.mcp_client = mcp_client
        self.agents = {}
        self.conversations = {}  # Store conversation history by conversation_id

        # AutoGen configuration
        self.llm_config = {
            "config_list": [
                {
                    "model": "gpt-4",
                    "api_key": os.getenv("OPENAI_API_KEY"),
                    "temperature": 0.7,
                }
            ],
            "timeout": 120,
        }

    async def initialize(self):
        """Initialize all agents"""
        logger.info("🤖 Initializing AutoGen agents...")

        # Create specialized agents
        self._create_document_agent()
        self._create_signing_agent()
        self._create_template_agent()
        self._create_admin_agent()

        logger.info(f"✅ Initialized {len(self.agents)} agents")

    def _create_document_agent(self):
        """Agent specialized in document operations"""
        self.agents["document"] = AssistantAgent(
            name="DocumentAgent",
            system_message="""You are a document management specialist for WeSign.
            Your responsibilities:
            - Upload documents to WeSign
            - List and search user documents
            - Retrieve document information
            - Manage document collections

            When users ask about documents, provide clear information and help them manage their documents.
            Always confirm actions before executing them.
            """,
            llm_config=self.llm_config,
        )

    def _create_signing_agent(self):
        """Agent specialized in signing workflows"""
        self.agents["signing"] = AssistantAgent(
            name="SigningAgent",
            system_message="""You are a digital signature specialist for WeSign.
            Your responsibilities:
            - Create self-signing documents
            - Add signature fields to documents
            - Complete signing processes
            - Save signed documents

            Guide users through the signing process step by step.
            Explain what signature fields are needed and where they should be placed.
            """,
            llm_config=self.llm_config,
        )

    def _create_template_agent(self):
        """Agent specialized in template operations"""
        self.agents["template"] = AssistantAgent(
            name="TemplateAgent",
            system_message="""You are a template management specialist for WeSign.
            Your responsibilities:
            - List available templates
            - Create new templates from documents
            - Use templates to create documents

            Help users understand templates and how they can speed up their workflow.
            """,
            llm_config=self.llm_config,
        )

    def _create_admin_agent(self):
        """Agent specialized in administrative tasks"""
        self.agents["admin"] = AssistantAgent(
            name="AdminAgent",
            system_message="""You are an administrative assistant for WeSign.
            Your responsibilities:
            - Check authentication status
            - Retrieve user information
            - Handle login/logout operations
            - Provide general help and guidance

            Be friendly and helpful. Guide users to the right specialist agent when needed.
            """,
            llm_config=self.llm_config,
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
        Process user message through agent system

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

            # Create user proxy for this conversation
            user_proxy = UserProxyAgent(
                name="UserProxy",
                human_input_mode="NEVER",
                max_consecutive_auto_reply=10,
                code_execution_config=False,
            )

            # Register MCP tool functions with the agent
            self._register_mcp_functions(self.agents[agent_choice], user_proxy)

            # Initialize conversation history
            if conversation_id not in self.conversations:
                self.conversations[conversation_id] = []

            # Process through selected agent
            chat_result = user_proxy.initiate_chat(
                self.agents[agent_choice],
                message=full_message,
                clear_history=False,
            )

            # Extract response from chat result
            response_text = self._extract_response(chat_result)
            tool_calls = self._extract_tool_calls(chat_result)

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

        # Signing-related keywords
        if any(word in message_lower for word in ["sign", "signature", "signing", "sign document", "add signature"]):
            return "signing"

        # Template-related keywords
        if any(word in message_lower for word in ["template", "templates", "use template", "create template"]):
            return "template"

        # Document-related keywords
        if any(word in message_lower for word in ["upload", "document", "documents", "file", "pdf", "list documents"]):
            return "document"

        # Default to admin for general queries
        return "admin"

    def _register_mcp_functions(self, assistant: AssistantAgent, user_proxy: UserProxyAgent):
        """
        Register MCP tool functions with agents

        Args:
            assistant: Assistant agent
            user_proxy: User proxy agent
        """
        # Register MCP tool execution wrapper
        @user_proxy.register_for_execution()
        @assistant.register_for_llm(description="Execute WeSign MCP tool")
        async def execute_wesign_tool(
            tool_name: str,
            parameters: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """
            Execute a WeSign MCP tool

            Args:
                tool_name: Name of the tool to execute
                parameters: Tool parameters

            Returns:
                Tool execution result
            """
            logger.info(f"🔧 Agent executing tool: {tool_name}")
            result = await self.mcp_client.execute_tool(tool_name, parameters)
            return result

    def _extract_response(self, chat_result) -> str:
        """
        Extract human-readable response from chat result

        Args:
            chat_result: AutoGen chat result

        Returns:
            Response text
        """
        try:
            # Get the last message from the assistant
            if hasattr(chat_result, 'chat_history') and chat_result.chat_history:
                last_message = chat_result.chat_history[-1]
                if isinstance(last_message, dict) and 'content' in last_message:
                    return last_message['content']
                return str(last_message)

            # Fallback to summary if available
            if hasattr(chat_result, 'summary'):
                return chat_result.summary

            return "Task completed successfully."

        except Exception as e:
            logger.error(f"Error extracting response: {e}")
            return "I've processed your request."

    def _extract_tool_calls(self, chat_result) -> List[Dict[str, Any]]:
        """
        Extract tool calls from chat result

        Args:
            chat_result: AutoGen chat result

        Returns:
            List of tool call dicts
        """
        tool_calls = []

        try:
            if hasattr(chat_result, 'chat_history'):
                for message in chat_result.chat_history:
                    # Check if message contains function calls
                    if isinstance(message, dict) and 'function_call' in message:
                        func_call = message['function_call']
                        tool_calls.append({
                            "tool": func_call.get('name', 'unknown'),
                            "action": "execute",
                            "parameters": func_call.get('arguments', {}),
                            "result": message.get('content', 'completed')
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
            "conversations": len(self.conversations)
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
