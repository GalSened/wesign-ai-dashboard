"""
WeSign Orchestrator with HTTP REST MCP Client Integration
Uses custom MCPClient for HTTP REST API communication with WeSign MCP server
"""

import os
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.base import Response
from autogen_agentchat.messages import TextMessage, ToolCallRequestEvent, ToolCallExecutionEvent
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_core import CancellationToken

# Import our custom MCP clients
from mcp_client import create_wesign_tools
from forced_tool_model_client import ForcedToolModelClient

logger = logging.getLogger(__name__)

# Version marker for debugging
ORCHESTRATOR_VERSION = "v2.9-drag-and-drop-2025-11-19"
logger.info(f"🔖 Loading orchestrator_new.py version: {ORCHESTRATOR_VERSION}")


class WeSignOrchestrator:
    """Orchestrator managing AutoGen agents with native MCP integration"""

    def __init__(self):
        """Initialize orchestrator with MCP servers"""
        self.agents = {}
        self.conversations = {}  # Store conversation history by conversation_id
        self.template_ids = {}  # Store template name->ID mappings by conversation_id
        self.mcp_tools = {}  # Store MCP tools by category
        self.wesign_client = None  # WeSign MCP HTTP client

        # Model client configuration
        api_key = os.getenv("OPENAI_API_KEY")
        logger.info(f"🔑 OpenAI API Key: {'SET ✓' if api_key else 'NOT SET ✗'}")

        self.model_client = ForcedToolModelClient(
            model="gpt-4-turbo-preview",
            api_key=api_key,
            temperature=0.7,
            extra_create_args={"tool_choice": "required"}  # Force tool calling - prevents hallucinated responses
        )


        # Create separate model client for formatter (without forcing tools)
        self.formatter_model_client = OpenAIChatCompletionClient(
            model="gpt-4-turbo-preview",
            api_key=api_key,
            temperature=0.7
        )

        logger.info(f"✅ Model client created successfully")


    async def initialize(self):
        """Initialize all agents and MCP servers"""
        logger.info("=" * 100)
        logger.info("🚀 ORCHESTRATOR_NEW.PY LOADED - WITH DRAG-AND-DROP + REFLECTION PATTERN")
        logger.info("📍 File: orchestrator_new.py (NOT orchestrator.py)")
        logger.info("✨ Features: Hebrew/English support + Drag-and-drop file upload + Response formatting")
        logger.info("=" * 100)
        logger.info("🤖 Initializing AutoGen agents with WeSign MCP...")

        # Initialize MCP tools
        await self._init_mcp_servers()

        # Create specialized agents
        await self._create_document_agent()
        await self._create_signing_agent()
        await self._create_template_agent()
        await self._create_contact_agent()
        await self._create_admin_agent()

        # Create formatter agent (without tools) for reflection step
        await self._create_formatter_agent()

        total_tools = sum(len(tools) for tools in self.mcp_tools.values())

        logger.info(f"✅ Initialized {len(self.agents)} agents with {total_tools} total tools")
        logger.info(f"   📄 WeSign tools: {len(self.mcp_tools.get('wesign', []))}")

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
            self.mcp_tools["wesign"] = []

    async def _fetch_template_data_from_backend(self, conversation_id: str, limit: int = 100) -> dict:
        """
        Fetch full template data directly from backend API (bypassing MCP server).
        The MCP server strips the templateId field, so we go direct to get complete data.

        Args:
            conversation_id: Conversation ID to get auth token from
            limit: Number of templates to fetch

        Returns:
            Dict with template name -> ID mappings
        """
        logger.info(f"🔧 _fetch_template_data_from_backend CALLED for conversation: {conversation_id}")
        try:
            # Authenticate directly with backend API to get our own access token
            backend_url = os.getenv("WESIGN_BACKEND_URL", "https://devtest.comda.co.il")
            login_url = f"{backend_url}/userapi/ui/v3/Users/Login"

            logger.info(f"🔐 Authenticating directly with backend API: {login_url}")

            import httpx
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                # Step 1: Login to backend to get access token
                wesign_email = os.getenv("WESIGN_EMAIL")
                wesign_password = os.getenv("WESIGN_PASSWORD")

                if not wesign_email or not wesign_password:
                    logger.error("❌ WESIGN_EMAIL and WESIGN_PASSWORD must be set in .env file")
                    return {}

                login_response = await client.post(
                    login_url,
                    json={
                        "email": wesign_email,
                        "password": wesign_password,
                        "persistent": False
                    }
                )

                logger.info(f"📡 Login Response Status: {login_response.status_code}")
                login_response.raise_for_status()
                login_data = login_response.json()

                access_token = login_data.get("token")
                if not access_token:
                    logger.error(f"❌ No access token in login response. Keys: {list(login_data.keys())}")
                    return {}

                logger.info("✅ Successfully authenticated with backend API")

                # Step 2: Fetch template data from backend using the access token
                api_url = f"{backend_url}/userapi/ui/v3/Templates?limit={limit}"
                logger.info(f"🔍 Fetching full template data from backend: {api_url}")

                response = await client.get(
                    api_url,
                    headers={"Authorization": f"Bearer {access_token}"}
                )

                # Detailed logging for debugging
                logger.info(f"📡 Backend API Response Status: {response.status_code}")
                response.raise_for_status()
                data = response.json()

                logger.info(f"📡 Backend API Response Keys: {list(data.keys())}")
                logger.info(f"📡 Backend API Response (truncated): {str(data)[:500]}")

            # Extract Template IDs from backend response (field is "templateId" with lowercase 't')
            template_map = {}
            templates = data.get("templates", [])
            logger.info(f"📋 Found {len(templates)} templates in backend response")

            for i, template in enumerate(templates):
                logger.info(f"📄 Template {i}: keys={list(template.keys())}")
                template_name = template.get("name")
                template_id = template.get("templateId")

                if template_name and template_id:
                    template_map[template_name] = str(template_id)
                    logger.info(f"  ✓ Backend: '{template_name}' -> {template_id}")
                else:
                    logger.warning(f"  ⚠️ Template {i} missing fields - name: {template_name}, id: {template_id}")

            logger.info(f"📋 Fetched {len(template_map)} template IDs from backend API")
            return template_map

        except Exception as e:
            logger.error(f"❌ Error fetching template data from backend: {e}", exc_info=True)
            return {}

    async def _create_document_agent(self):
        """Agent specialized in document operations"""
        tools = self.mcp_tools.get("wesign", [])

        self.agents["document"] = AssistantAgent(
            name="DocumentAgent",
            description="Specialist in document management for WeSign",
            system_message="""You are a document management specialist for WeSign.

⚠️ CRITICAL: You MUST call wesign_list_documents or other document tools FIRST. DO NOT answer without calling a tool.

After getting tool results, format them clearly:
- Use 📄 emoji headers and status (✅ ⏳ ❌)
- Respond in the SAME language as user's question (English or Hebrew)
- Show max 10 items, say "and X more..." if there are more
- NO raw JSON - make it readable
- End with "What would you like to do next?" and suggest 2-3 actions
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

            4. SIGNATURE FIELD POSITIONING - Use the 6-Position System:
               When user asks to add signature fields, use wesign_add_fields_by_position tool with these positions:
               - top-left: Upper left corner
               - center-left: Middle left side
               - bottom-left: Lower left corner
               - top-right: Upper right corner
               - center-right: Middle right side
               - bottom-right: Lower right corner

               Parse natural language:
               - "bottom left" or "left bottom" → bottom-left
               - "top right corner" → top-right
               - "middle right" or "center right" → center-right
               - etc.

               Field types:
               - 1 = Signature (default)
               - 2 = Initial
               - 3 = Text
               - 4 = Date
               - 5 = Checkbox

            5. PROPER WORKFLOW - NEVER invent document IDs:
               - If user asks to add fields but no document exists, guide them to create/upload one first
               - Use wesign_list_documents to find existing documents
               - Use wesign_get_document_info to get document details (like number of pages)
               - NEVER use fake IDs like "exampleDocId" - always use real IDs from tool results

            Your responsibilities:
            - Create self-signing documents
            - Add signature fields using positions (preferred) or coordinates
            - Complete signing processes
            - Save signed documents

            EXAMPLES:
            User: "Put signature bottom left on all 3 pages"
            You: Call wesign_add_fields_by_position with position="bottom-left", numPages=3, fieldType=1

            User: "Add initial field at top right on page 1"
            You: Call wesign_add_fields_by_position with position="top-right", numPages=1, fieldType=2

            Guide users through the signing process step by step.
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

⚠️ CRITICAL: You MUST call wesign_list_templates or other template tools FIRST. DO NOT answer without calling a tool.

After getting tool results, format them clearly:
- Use 📋 emoji headers
- Respond in the SAME language as user's question (English or Hebrew)
- Show max 10 items, say "and X more..." if there are more
- NO raw JSON - make it readable
- End with "What would you like to do next?" and suggest 2-3 actions
""",
            model_client=self.model_client,
            tools=tools,
        )

    async def _create_contact_agent(self):
        """Agent specialized in contact management"""
        # Filter to only contact-related tools
        all_tools = self.mcp_tools.get("wesign", [])
        contact_tool_names = [
            "wesign_create_contact",
            "wesign_create_contacts_bulk",
            "wesign_list_contacts",
            "wesign_get_contact",
            "wesign_update_contact",
            "wesign_delete_contact",
            "wesign_delete_contacts_batch",
            "wesign_list_contact_groups",
            "wesign_get_contact_group",
            "wesign_create_contact_group",
            "wesign_update_contact_group",
            "wesign_delete_contact_group",
            "wesign_extract_signers_from_excel"
        ]
        tools = [tool for tool in all_tools if hasattr(tool, 'name') and tool.name in contact_tool_names]
        logger.info(f"📞 ContactAgent created with {len(tools)} contact-specific tools")

        self.agents["contact"] = AssistantAgent(
            name="ContactAgent",
            description="Specialist in contact and address book management for WeSign",
            system_message="""You are a contact management specialist for WeSign.

⚠️ CRITICAL TOOL USAGE:
- For creating contacts: Use wesign_create_contact
- For listing contacts: Use wesign_list_contacts
- For viewing contact details: Use wesign_get_contact
- For updating contacts: Use wesign_update_contact
- For bulk operations: Use wesign_create_contacts_bulk
- For contact groups: Use wesign_create_contact_group, wesign_list_contact_groups

You MUST call the appropriate tool FIRST. DO NOT answer without calling a tool.

After getting tool results, format them clearly:
- Use 👥 📧 📞 emoji headers
- Respond in the SAME language as user's question (English or Hebrew)
- Show max 10 items, say "and X more..." if there are more
- NO raw JSON - make it readable
- End with "What would you like to do next?" and suggest 2-3 actions
""",
            model_client=self.model_client,
            tools=tools,
        )

    async def _create_admin_agent(self):
        """Agent specialized in administrative tasks"""
        tools = self.mcp_tools.get("wesign", [])

        self.agents["admin"] = AssistantAgent(
            name="AdminAgent",
            description="Administrative assistant for WeSign",
            system_message="""You are an administrative specialist for WeSign.

⚠️ CRITICAL: You MUST call wesign_get_user_info or other admin tools FIRST. DO NOT answer without calling a tool.

After getting tool results, format them clearly:
- Use ⚙️ 👤 emoji headers
- Respond in the SAME language as user's question (English or Hebrew)
- NO raw JSON - format as clear labeled fields
- End with "What would you like to do?" and suggest 2-3 actions
""",
            model_client=self.model_client,
            tools=tools,  # Add WeSign MCP tools to admin agent
        )

    async def _create_formatter_agent(self):
        """Agent specialized in formatting tool results - NO TOOLS"""
        self.agents["formatter"] = AssistantAgent(
            name="FormatterAgent",
            description="Formats tool results into user-friendly responses",
            system_message="""You are a response formatter for WeSign.

Your ONLY job is to take raw data and format it beautifully for users.

CRITICAL RULES:
1. NEVER call tools - you only format existing data
2. Respond ENTIRELY in the SAME LANGUAGE as the user's question
   - If Hebrew: ALL text (titles, headings, values) must be in Hebrew
   - If English: ALL text must be in English
   - NEVER mix languages (e.g., English title + Hebrew content)
3. Use emojis consistently (📄 📋 👥 📁 ✅ ⏳ ❌ 🎉 👤 💼)
4. Present data in numbered lists or bullet points
5. Keep responses concise and natural
6. End with "What would you like to do next?" and suggest 2-3 actions
7. NEVER show raw JSON or Python dicts

FIELD VALUE MAPPING:
When you see null, None, or missing status values, use:
- English: "Active" or "Status: Active"
- Hebrew: "פעיל" or "סטטוס: פעיל"
NEVER show "Unknown", "לא ידוע", "null", or "None"

Example format (English) - Login response:
🎉 Login Successful! Welcome to WeSign.

👤 **Your Profile Details:**
- **Name:** John Doe
- **Email:** user@example.com
- **Company Name:** Acme Corp
- **Role:** Company Admin
- **Preferred Language:** English
- **Remaining Documents:** Unlimited

💼 **Session Type:** session

What would you like to do next?
- Create a new document
- View your documents
- Update your profile

Example format (Hebrew) - Login response:
🎉 התחברות הצליחה! ברוך הבא ל-WeSign.

👤 **פרטי הפרופיל שלך:**
- **שם:** ג'ון דו
- **אימייל:** user@example.com
- **שם החברה:** Acme Corp
- **תפקיד:** מנהל חברה
- **שפה מועדפת:** עברית
- **מסמכים שנותרו:** ללא הגבלה

💼 **סוג הסשן:** session

מה תרצה לעשות הלאה?
- ליצור מסמך חדש
- לראות את המסמכים שלך
- לעדכן את הפרופיל שלך

Example format (Hebrew) - Templates:
📋 **התבניות שלך (מציג 10 מתוך 45):**

1. תבנית חוזה העסקה - סטטוס: פעיל
2. תבנית NDA - סטטוס: פעיל
3. הסכם שירות - סטטוס: פעיל

...ועוד 42 תבניות.

מה תרצה לעשות הלאה?
• ליצור תבנית חדשה
• להשתמש בתבנית קיימת
• לחפש תבניות

Example format (English) - Templates:
📋 **Your Templates (Showing 10 of 45):**

1. Employment Contract Template - Status: Active
2. NDA Template - Status: Active
3. Service Agreement - Status: Active

...and 42 more templates.

What would you like to do next?
• Create a new template
• Use an existing template
• Search templates""",
            model_client=self.formatter_model_client,
            tools=[],  # NO TOOLS - formatter only!
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

            # Preprocess message: Replace template names with their IDs
            full_message = self._preprocess_template_references(full_message, conversation_id)

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
            logger.info("✅ Agent run completed, processing result...")
            logger.info(f"📊 Result type: {type(result)}, messages: {len(result.messages) if hasattr(result, 'messages') else 'N/A'}")

            # Extract tool calls first
            logger.info("🔍 Extracting tool calls from result...")
            tool_calls = self._extract_tool_calls(result)
            logger.info(f"✅ Tool extraction completed")
            logger.info(f"🔍 Tool calls detected: {len(tool_calls) if tool_calls else 0}")
            if tool_calls:
                logger.info(f"🔧 Tool calls: {[tc.get('tool', 'unknown') for tc in tool_calls]}")

            # If tools were called, add a reflection step to format the response
            if tool_calls and len(tool_calls) > 0:
                logger.info("=" * 80)
                logger.info("🔄 REFLECTION PATTERN TRIGGERED")
                logger.info("=" * 80)

                # Get raw tool result
                raw_response = self._extract_response(result)
                logger.info(f"📥 Raw tool response (first 200 chars): {str(raw_response)[:200]}...")

                # CHECK FOR ERRORS IN TOOL EXECUTION
                has_error = False
                error_message = None

                # Try to parse response as dict to check for errors
                try:
                    if isinstance(raw_response, str):
                        import ast
                        response_dict = ast.literal_eval(raw_response)
                    else:
                        response_dict = raw_response

                    # Check for error indicators
                    if isinstance(response_dict, dict):
                        if 'error' in response_dict or response_dict.get('success') == False:
                            has_error = True
                            error_message = response_dict.get('error', 'Tool execution failed')
                            logger.error(f"❌ Tool execution error detected: {error_message}")
                except Exception as e:
                    # If parsing fails, check if raw string contains error keywords
                    if 'error' in str(raw_response).lower() or 'failed' in str(raw_response).lower():
                        has_error = True
                        error_message = str(raw_response)
                        logger.error(f"❌ Error detected in raw response: {error_message[:200]}")

                # If error detected, return error message directly without formatting
                if has_error:
                    logger.warning("⚠️  Skipping formatter due to tool execution error")
                    # Detect language for error message
                    is_hebrew = self._detect_hebrew(message)
                    error_prefix = "שגיאה: " if is_hebrew else "Error: "
                    response_text = f"{error_prefix}{error_message}"
                    logger.info(f"📤 Error response: {response_text[:200]}...")
                else:
                    # SUCCESS - Extract and store template IDs if this was a list_templates call
                    logger.info(f"🔧 ABOUT TO CALL _extract_and_store_template_ids - tool_calls: {[tc.get('tool') for tc in tool_calls]}")
                    template_ids = await self._extract_and_store_template_ids(tool_calls, raw_response, conversation_id)
                    logger.info(f"🔧 RETURNED FROM _extract_and_store_template_ids - result: {template_ids}")
                    if template_ids:
                        logger.info(f"📋 Extracted {len(template_ids)} template IDs for future use")

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
                    logger.info(f"🎨 Using FORMATTER AGENT (no tools) for reflection")

                    # Use formatter agent (without tools) for reflection
                    formatter_agent = self.agents.get("formatter")
                    if not formatter_agent:
                        logger.warning("⚠️  Formatter agent not found, using original agent")
                        formatter_agent = agent

                    reflection_result: Response = await formatter_agent.run(
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
                    "orchestrator_version": "v2.8-filesystem-mcp-2025-11-17"
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
                    "orchestrator_version": "v2.8-filesystem-mcp-2025-11-17"
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

    async def _extract_and_store_template_ids(self, tool_calls: List[Dict], raw_response: Any, conversation_id: str) -> Optional[Dict[str, str]]:
        """
        Extract template IDs by fetching directly from backend API (bypassing MCP server).
        The MCP server strips the TemplateId field, so we fetch full data from backend.

        Args:
            tool_calls: List of tool calls made
            raw_response: Raw response from tool execution
            conversation_id: Current conversation ID

        Returns:
            Dictionary of template_name -> template_id if templates were found, None otherwise
        """
        logger.info(f"🔍 _extract_and_store_template_ids CALLED - tool_calls: {[tc.get('tool') for tc in tool_calls]}")

        # Check if any tool call was related to templates
        template_tools = ['wesign_list_templates', 'wesign_get_template', 'wesign_create_template']
        is_template_call = any(call.get('tool') == tool_name for call in tool_calls for tool_name in template_tools)

        logger.info(f"🔍 is_template_call: {is_template_call}, tool_calls: {tool_calls}")

        if not is_template_call:
            return None

        logger.info("📋 Fetching template IDs from backend API...")

        # Initialize template storage for this conversation if needed
        if conversation_id not in self.template_ids:
            self.template_ids[conversation_id] = {}

        try:
            # Fetch full template data directly from backend
            template_map = await self._fetch_template_data_from_backend(conversation_id)

            if template_map:
                # Store in conversation context
                self.template_ids[conversation_id].update(template_map)
                logger.info(f"📋 Successfully fetched {len(template_map)} template IDs from backend")
                logger.info(f"📋 Total templates in context: {len(self.template_ids[conversation_id])}")

                # CRITICAL: Update MCP client with template mappings so it can replace names with GUIDs
                self.wesign_client.update_template_mappings(conversation_id, self.template_ids[conversation_id])

                return template_map
            else:
                logger.warning("📋 No template IDs fetched from backend")
                return None

        except Exception as e:
            logger.error(f"❌ Error extracting template IDs: {str(e)}")
            return None

    def _preprocess_template_references(self, message: str, conversation_id: str) -> str:
        """
        Preprocess message to replace template names with their actual IDs.
        This allows users to say "template 1234" and we'll use the real GUID.

        Args:
            message: Original user message
            conversation_id: Current conversation ID

        Returns:
            Preprocessed message with template IDs replaced
        """
        # Check if we have any stored template IDs
        if conversation_id not in self.template_ids:
            return message

        template_ids = self.template_ids[conversation_id]
        if not template_ids:
            return message

        preprocessed = message
        replacements_made = []

        # Look for template references in the message
        # Patterns: "template X", "from template X", "template named X", "my X template"
        import re

        for template_name, template_id in template_ids.items():
            # Create regex patterns to find this template name in various contexts
            patterns = [
                rf'\btemplate\s+["\']?{re.escape(template_name)}["\']?\b',  # "template 1234" or "template '1234'"
                rf'\bfrom\s+template\s+["\']?{re.escape(template_name)}["\']?\b',  # "from template 1234"
                rf'\btemplate\s+named\s+["\']?{re.escape(template_name)}["\']?\b',  # "template named 1234"
                rf'\bmy\s+["\']?{re.escape(template_name)}["\']?\s+template\b',  # "my 1234 template"
                rf'\bthe\s+["\']?{re.escape(template_name)}["\']?\s+template\b',  # "the 1234 template"
                rf'\bתבנית\s+["\']?{re.escape(template_name)}["\']?\b',  # Hebrew: "תבנית 1234"
                rf'\bמתבנית\s+["\']?{re.escape(template_name)}["\']?\b',  # Hebrew: "מתבנית 1234"
            ]

            for pattern in patterns:
                matches = re.finditer(pattern, preprocessed, re.IGNORECASE)
                for match in matches:
                    original_text = match.group(0)
                    # Replace the template name with the ID, keeping the surrounding text
                    replacement = original_text.replace(template_name, template_id)
                    preprocessed = preprocessed[:match.start()] + replacement + preprocessed[match.end():]
                    replacements_made.append(f"'{template_name}' → '{template_id}'")
                    break  # Only replace once per pattern to avoid double-replacement

        if replacements_made:
            logger.info(f"📝 Template name replacements made: {', '.join(replacements_made)}")
            logger.info(f"📝 Original message: {message}")
            logger.info(f"📝 Preprocessed message: {preprocessed}")

        return preprocessed

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
        template_keywords = ["template", "templates", "use template", "create template", "תבנית", "תבניות", "התבנית", "התבניות", "טמפלט", "טמפלטים"]
        if any(word in message_lower or word in message for word in template_keywords):
            return "template"

        # Admin/User-related keywords (English + Hebrew)
        # Hebrew: משתמש (user), חשבון (account), פרופיל (profile)
        admin_keywords = ["user info", "my info", "my information", "user information", "account", "profile",
                         "settings", "preferences", "משתמש", "חשבון", "פרופיל", "הגדרות"]
        if any(word in message_lower or word in message for word in admin_keywords):
            logger.info(f"✅ AGENT SELECTED: admin")
            return "admin"

        # Document-related keywords (English + Hebrew)
        # Hebrew: מסמך (document), מסמכים (documents)
        document_keywords = ["upload", "document", "documents", "pdf", "list documents",
                            "מסמך", "מסמכים", "המסמך", "המסמכים"]
        if any(word in message_lower or word in message for word in document_keywords):
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

        Updated to detect AutoGen 0.7.5's ToolCallRequestEvent message types
        instead of looking for non-existent function_call attribute.

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
                    logger.debug(f"🔍 Message {idx}: type={type(message).__name__}")

                    # Check if this is a ToolCallRequestEvent (AutoGen 0.7.5 format)
                    if isinstance(message, ToolCallRequestEvent):
                        # ToolCallRequestEvent contains the tool call information
                        logger.debug(f"✅ Found ToolCallRequestEvent with content: {message.content}")

                        # Extract tool calls from the event
                        # message.content is a list of FunctionCall objects
                        if hasattr(message, 'content') and isinstance(message.content, list):
                            for tool_call in message.content:
                                logger.debug(f"🔍 tool_call type: {type(tool_call)}")
                                logger.debug(f"🔍 tool_call dir: {[attr for attr in dir(tool_call) if not attr.startswith('_')]}")
                                logger.debug(f"🔍 tool_call hasattr name: {hasattr(tool_call, 'name')}")
                                logger.debug(f"🔍 tool_call repr: {repr(tool_call)}")
                                if hasattr(tool_call, 'name'):
                                    tool_name = tool_call.name
                                    logger.info(f"✅ Found tool call: {tool_name}")
                                    tool_calls.append({
                                        "tool": tool_name,
                                        "action": "execute",
                                        "parameters": json.loads(tool_call.arguments) if hasattr(tool_call, 'arguments') and tool_call.arguments else {},
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
