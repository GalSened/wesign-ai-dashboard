"""
WeSign Orchestrator with HTTP REST MCP Client Integration
Uses custom MCPClient for HTTP REST API communication with WeSign MCP server
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
from autogen_core import CancellationToken

# Import our custom MCP client
from mcp_client import create_wesign_tools

logger = logging.getLogger(__name__)


class WeSignOrchestrator:
    """Orchestrator managing AutoGen agents with native MCP integration"""

    def __init__(self):
        """Initialize orchestrator with MCP servers"""
        self.agents = {}
        self.conversations = {}  # Store conversation history by conversation_id
        self.mcp_tools = {}  # Store MCP tools by category
        self.wesign_client = None  # WeSign MCP HTTP client

        # Model client configuration
        api_key = os.getenv("OPENAI_API_KEY")
        logger.info(f"🔑 Loading OpenAI API Key from env: {api_key[:20] if api_key else 'NOT SET'}...")
        logger.info(f"🔑 API Key type: {type(api_key)}, length: {len(api_key) if api_key else 0}")
        logger.info(f"🔑 Full key (masked): {api_key[:10]}...{api_key[-10:] if api_key and len(api_key) > 20 else 'TOO_SHORT'}")

        self.model_client = OpenAIChatCompletionClient(
            model="gpt-4",
            api_key=api_key,
            temperature=0.7,
        )

        logger.info(f"✅ Model client created successfully")

    async def initialize(self):
        """Initialize all agents and MCP servers"""
        logger.info("=" * 100)
        logger.info("🚀 ORCHESTRATOR_NEW.PY LOADED - WITH REFLECTION PATTERN")
        logger.info("📍 File: orchestrator_new.py (NOT orchestrator.py)")
        logger.info("✨ Features: Hebrew/English support + Response formatting reflection")
        logger.info("=" * 100)
        logger.info("🤖 Initializing AutoGen agents with WeSign MCP HTTP client...")

        # Initialize MCP tools
        await self._init_mcp_servers()

        # Create specialized agents
        await self._create_document_agent()
        await self._create_signing_agent()
        await self._create_template_agent()
        await self._create_contact_agent()
        await self._create_admin_agent()

        total_tools = sum(len(tools) for tools in self.mcp_tools.values())
        logger.info(f"✅ Initialized {len(self.agents)} agents with {total_tools} WeSign tools")

    async def _init_mcp_servers(self):
        """Initialize WeSign MCP HTTP client and load tools"""
        try:
            # WeSign MCP Server (HTTP REST based)
            logger.info("🔧 Initializing WeSign MCP HTTP client...")

            wesign_url = os.getenv("WESIGN_MCP_URL", "http://localhost:3000")
            logger.info(f"📡 Connecting to WeSign MCP at: {wesign_url}")

            # Create WeSign MCP client and fetch tools
            self.wesign_client, wesign_tools = await create_wesign_tools(wesign_url)
            self.mcp_tools["wesign"] = wesign_tools

            logger.info(f"✅ WeSign MCP: {len(wesign_tools)} tools available via HTTP REST")

        except Exception as e:
            logger.error(f"❌ Error initializing WeSign MCP client: {e}", exc_info=True)
            logger.warning("⚠️  WeSign MCP unavailable - continuing with 0 tools")
            # Continue without MCP tools
            self.mcp_tools = {"wesign": []}

    async def _create_document_agent(self):
        """Agent specialized in document operations"""
        tools = self.mcp_tools.get("wesign", [])

        self.agents["document"] = AssistantAgent(
            name="DocumentAgent",
            description="Specialist in document management for WeSign",
            system_message="""You are a document management specialist for WeSign.

            IMPORTANT INSTRUCTIONS:
            1. ALWAYS respond in the SAME LANGUAGE as the user's question
               - If user asks in Hebrew, respond in Hebrew
               - If user asks in English, respond in English

            2. Format responses clearly and naturally:
               - Present documents as a readable list, NOT as JSON
               - Use clear formatting with bullet points or numbers
               - Keep responses concise and user-friendly

            3. After providing information, ALWAYS suggest helpful next steps

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

            IMPORTANT INSTRUCTIONS:
            1. ALWAYS respond in the SAME LANGUAGE as the user's question
               - If user asks in Hebrew, respond in Hebrew
               - If user asks in English, respond in English

            2. Format responses clearly and naturally:
               - Present information in a readable format, NOT as JSON
               - Use clear formatting with bullet points or numbers
               - Keep responses concise and user-friendly

            3. After providing information, ALWAYS suggest helpful next steps

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

            IMPORTANT INSTRUCTIONS:
            1. ALWAYS respond in the SAME LANGUAGE as the user's question
               - If user asks in Hebrew, respond in Hebrew
               - If user asks in English, respond in English

            2. Format responses clearly and naturally:
               - Present templates as a numbered list, NOT as JSON
               - Use clear formatting with bullet points or numbers
               - Keep responses concise and user-friendly

            3. After providing information, ALWAYS suggest helpful next steps:
               - What actions the user can take
               - Related features they might want to use
               - How to accomplish their goal

            Your responsibilities:
            - List available templates in an organized, readable format
            - Create new templates from documents
            - Use templates to create documents
            - Guide users on best practices for template usage

            Example Hebrew response format:
            מצאתי 50 תבניות במערכת שלך:

            1. תבנית 1
            2. תבנית 2
            3. תבנית 3

            מה תרצה לעשות הלאה?
            - לצפות בפרטי תבנית מסוימת
            - ליצור מסמך חדש מתבנית
            - להעלות תבנית חדשה
            """,
            model_client=self.model_client,
            tools=tools,
        )

    async def _create_contact_agent(self):
        """Agent specialized in contact management"""
        tools = self.mcp_tools.get("wesign", [])

        self.agents["contact"] = AssistantAgent(
            name="ContactAgent",
            description="Specialist in contact and address book management for WeSign",
            system_message="""You are a contact management specialist for WeSign.

            IMPORTANT INSTRUCTIONS:
            1. ALWAYS respond in the SAME LANGUAGE as the user's question
               - If user asks in Hebrew, respond in Hebrew
               - If user asks in English, respond in English

            2. Format responses clearly and naturally:
               - Present contacts as a numbered list, NOT as JSON
               - Show contact names, emails, and phone numbers in a readable format
               - Use clear formatting with bullet points or numbers
               - Keep responses concise and user-friendly

            3. After providing information, ALWAYS suggest helpful next steps:
               - What actions the user can take
               - Related features they might want to use
               - How to accomplish their goal

            Your responsibilities:
            - List and search contacts in an organized, readable format
            - Create new contacts in the address book
            - Update existing contact information
            - Delete contacts when requested
            - Manage contact groups
            - Guide users on best practices for contact management

            Example Hebrew response format:
            מצאתי 15 אנשי קשר בספר הכתובות שלך:

            1. ירון כהן - yaron@example.com - 050-1234567
            2. שרה לוי - sarah@example.com - 052-9876543
            3. דוד מזרחי - david@example.com - 054-5555555

            מה תרצה לעשות הלאה?
            - להוסיף איש קשר חדש
            - לערוך פרטי איש קשר
            - ליצור קבוצת אנשי קשר
            - לשלוח מסמך לחתימה לאחד מאנשי הקשר
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

            # Extract tool calls first
            tool_calls = self._extract_tool_calls(result)
            logger.info(f"🔍 Tool calls detected: {len(tool_calls) if tool_calls else 0}")
            if tool_calls:
                logger.info(f"🔧 Tool calls: {[tc.get('name', 'unknown') for tc in tool_calls]}")

            # If tools were called, add a reflection step to format the response
            if tool_calls and len(tool_calls) > 0:
                logger.info("=" * 80)
                logger.info("🔄 REFLECTION PATTERN TRIGGERED")
                logger.info("=" * 80)

                # Get raw tool result
                raw_response = self._extract_response(result)
                logger.info(f"📥 Raw tool response (first 200 chars): {str(raw_response)[:200]}...")

                # Detect the language of the original question
                is_hebrew = self._detect_hebrew(message)
                logger.info(f"🌍 Language detected: {'Hebrew (עברית)' if is_hebrew else 'English'}")
                language_instruction = "עליך לענות בעברית" if is_hebrew else "You must respond in English"

                # Create a reflection prompt asking the agent to format the tool result
                reflection_prompt = f"""{language_instruction}.

The user asked: "{message}"

A tool was executed and returned this raw data:
{raw_response}

Your task:
1. Format this data in a user-friendly way (NOT as JSON)
2. Present it clearly in numbered lists or bullet points
3. Suggest helpful next steps the user can take
4. Keep your response concise and natural

Remember: Respond in the SAME LANGUAGE as the user's question!"""

                logger.info(f"🔄 Running reflection step to format response...")
                logger.info(f"📝 Reflection prompt language: {'Hebrew (עברית)' if is_hebrew else 'English'}")
                reflection_result: Response = await agent.run(
                    task=reflection_prompt,
                    cancellation_token=cancellation_token
                )

                response_text = self._extract_response(reflection_result)
                logger.info(f"📤 Formatted response (first 200 chars): {str(response_text)[:200]}...")
                logger.info("=" * 80)
                logger.info("✅ REFLECTION PATTERN COMPLETED")
                logger.info("=" * 80)
            else:
                logger.info("ℹ️  No tool calls detected - using direct agent response")
                # No tools called, use direct response
                response_text = self._extract_response(result)

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
                    "files_count": len(files) if files else 0,
                    "orchestrator_version": "v2.7-contact-agent-debug-2025-11-11"
                }
            }

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            return {
                "response": f"I encountered an error: {str(e)}. Please try again.",
                "conversation_id": conversation_id or f"conv-{user_id}-{datetime.now().timestamp()}",
                "tool_calls": [],
                "metadata": {
                    "error": str(e),
                    "orchestrator_version": "v2.7-contact-agent-debug-2025-11-11"
                }
            }

    def _detect_hebrew(self, text: str) -> bool:
        """
        Detect if text contains Hebrew characters

        Args:
            text: Text to check

        Returns:
            True if text contains Hebrew characters
        """
        hebrew_chars = set(range(0x0590, 0x05FF))  # Hebrew Unicode block
        return any(ord(char) in hebrew_chars for char in text)

    def _select_agent(self, message: str) -> str:
        """
        Select appropriate agent based on message content
        Supports both English and Hebrew keywords

        Args:
            message: User message

        Returns:
            Agent name key
        """
        message_lower = message.lower()
        print(f"\n{'='*80}")
        print(f"🔍 _SELECT_AGENT CALLED - Message: '{message}'")
        print(f"🔍 _SELECT_AGENT - Message (lowercase): '{message_lower}'")
        print(f"{'='*80}\n")
        logger.info(f"🔍 AGENT SELECTION - Message: '{message}'")
        logger.info(f"🔍 AGENT SELECTION - Message (lowercase): '{message_lower}'")

        # FileSystem-related keywords (English)
        if any(word in message_lower for word in ["file", "browse", "select file", "read file", "list files", "show files"]):
            if "filesystem" in self.agents:
                logger.info(f"✅ AGENT SELECTED: filesystem")
                return "filesystem"

        # Contact-related keywords (English + Hebrew)
        # Hebrew: איש קשר (contact), אנשי קשר (contacts), ספר כתובות (address book), קבוצה (group)
        # Including versions with definite article (הקשר vs קשר)
        contact_keywords = ["contact", "contacts", "address book", "create contact",
                            "איש קשר", "איש הקשר", "אנשי קשר", "אנשי הקשר",
                            "ספר כתובות", "ספר הכתובות", "קבוצה", "קבוצת", "הקבוצה"]
        logger.info(f"🔍 Checking contact keywords: {contact_keywords}")
        contact_match = any(word in message_lower or word in message for word in contact_keywords)
        logger.info(f"🔍 Contact keyword match: {contact_match}")
        if contact_match:
            logger.info(f"✅ AGENT SELECTED: contact")
            return "contact"

        # Signing-related keywords (English + Hebrew)
        # Hebrew: חתימה (signature), לחתום (to sign), חתימה דיגיטלית (digital signature)
        if any(word in message_lower for word in ["sign", "signature", "signing", "sign document", "add signature", "חתימה", "לחתום", "חתימה דיגיטלית"]):
            logger.info(f"✅ AGENT SELECTED: signing")
            return "signing"

        # Template-related keywords (English + Hebrew)
        # Hebrew: טמפלט (template), טמפלטים (templates), רשימת טמפלטים (template list)
        if any(word in message_lower or word in message for word in ["template", "templates", "use template", "create template", "טמפלט", "טמפלטים"]):
            logger.info(f"✅ AGENT SELECTED: template")
            return "template"

        # Document-related keywords (English + Hebrew)
        # Hebrew: מסמך (document), מסמכים (documents)
        if any(word in message_lower or word in message for word in ["upload", "document", "documents", "pdf", "list documents", "מסמך", "מסמכים"]):
            logger.info(f"✅ AGENT SELECTED: document")
            return "document"

        # Default to admin for general queries
        logger.info(f"✅ AGENT SELECTED: admin (default)")
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

                # Handle ToolCallSummaryMessage or other message types with content attribute
                if hasattr(last_message, 'content'):
                    content = last_message.content
                    # If content is a JSON string, parse it and extract text
                    if isinstance(content, str):
                        try:
                            import json
                            parsed_content = json.loads(content)
                            # Extract text from parsed content
                            if isinstance(parsed_content, list):
                                texts = []
                                for item in parsed_content:
                                    if isinstance(item, dict) and 'text' in item:
                                        texts.append(item['text'])
                                if texts:
                                    return '\n'.join(texts)
                            elif isinstance(parsed_content, dict) and 'text' in parsed_content:
                                return parsed_content['text']
                        except json.JSONDecodeError:
                            # Not JSON, return as is
                            return content
                    return str(content)

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
            logger.debug(f"🔍 _extract_tool_calls: Checking for tool calls in result")
            logger.debug(f"🔍 Result has 'messages': {hasattr(result, 'messages')}")

            if hasattr(result, 'messages'):
                logger.debug(f"🔍 Number of messages: {len(result.messages)}")
                for idx, message in enumerate(result.messages):
                    logger.debug(f"🔍 Message {idx}: type={type(message)}, has function_call={hasattr(message, 'function_call')}")

                    # Check for tool calls in message
                    if hasattr(message, 'function_call'):
                        func_call = message.function_call
                        tool_name = func_call.get('name', 'unknown')
                        logger.info(f"✅ Found tool call: {tool_name}")
                        tool_calls.append({
                            "tool": tool_name,
                            "action": "execute",
                            "parameters": func_call.get('arguments', {}),
                            "result": "completed"
                        })

            logger.debug(f"🔍 Total tool calls extracted: {len(tool_calls)}")

        except Exception as e:
            logger.error(f"❌ Error extracting tool calls: {e}", exc_info=True)

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
