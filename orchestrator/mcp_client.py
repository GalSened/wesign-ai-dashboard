"""
WeSign MCP Client - HTTP REST wrapper for WeSign MCP Server
Bridges the gap between WeSign's HTTP REST API and AutoGen's tool expectations
"""

import os
import logging
import inspect
from typing import Dict, Any, List, Optional
import httpx
from autogen_core.tools import FunctionTool

logger = logging.getLogger(__name__)


class WeSignMCPClient:
    """
    HTTP REST client for WeSign MCP Server
    Converts WeSign HTTP tools to AutoGen-compatible FunctionTool objects
    """

    def __init__(self, base_url: str = None):
        """
        Initialize WeSign MCP Client

        Args:
            base_url: Base URL of WeSign MCP server (default: http://localhost:3000)
        """
        self.base_url = base_url or os.getenv("WESIGN_MCP_URL", "http://localhost:3000")
        self.tools_cache: List[Dict[str, Any]] = []
        self._http_client = httpx.AsyncClient(timeout=30.0)

        # Store template name → GUID mappings per conversation
        # Structure: {conversation_id: {template_name: template_guid}}
        self.template_ids: Dict[str, Dict[str, str]] = {}

        logger.info(f"📡 Initialized WeSignMCPClient: {self.base_url}")

    def update_template_mappings(self, conversation_id: str, mappings: Dict[str, str]):
        """
        Update template name → GUID mappings for a conversation

        This is called by the orchestrator when it fetches templates directly from the backend.
        The MCP client uses these mappings to automatically replace template names with GUIDs
        when tools are executed.

        Args:
            conversation_id: Conversation ID
            mappings: Dictionary of {template_name: template_guid}
        """
        self.template_ids[conversation_id] = mappings
        logger.info(f"📋 Updated template mappings for conversation {conversation_id}: {len(mappings)} templates")

    async def fetch_tools(self) -> List[Dict[str, Any]]:
        """
        Fetch tools from WeSign MCP server using REST GET endpoint

        NOTE: The /tools endpoint only returns name and description, not full inputSchema.
        This is a limitation of the current WeSign MCP server implementation.

        Returns:
            List of tool definitions from server
        """
        try:
            response = await self._http_client.get(f"{self.base_url}/tools")
            response.raise_for_status()

            data = response.json()
            if not data.get("success"):
                logger.error(f"❌ Tools fetch failed: {data}")
                return []

            self.tools_cache = data.get("tools", [])
            logger.info(f"✅ Fetched {len(self.tools_cache)} tools from WeSign MCP server")
            return self.tools_cache

        except Exception as e:
            logger.error(f"❌ Error fetching tools: {e}")
            return []

    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """
        Execute a WeSign tool via HTTP REST API

        Args:
            tool_name: Name of the tool to execute
            arguments: Tool arguments

        Returns:
            Tool execution result
        """
        try:
            logger.info(f"🔧 Executing tool: {tool_name} with args: {arguments}")

            # CRITICAL: Replace template names with GUIDs BEFORE sending to MCP server
            # This fixes HTTP 400 errors when using templates by name
            template_tools = [
                'wesign_use_template',
                'wesign_send_simple_document',
                'wesign_get_template',
                'wesign_update_template_fields'
            ]

            if tool_name in template_tools and 'templateId' in arguments:
                template_name_or_id = arguments['templateId']

                # Check if this looks like a name (not a GUID)
                # GUIDs contain hyphens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                if '-' not in str(template_name_or_id):
                    # This is a template name, try to find the GUID
                    found_guid = None

                    # Search all conversation mappings for this template name
                    for conv_id, mappings in self.template_ids.items():
                        if template_name_or_id in mappings:
                            found_guid = mappings[template_name_or_id]
                            logger.info(f"✅ Replaced template name '{template_name_or_id}' with GUID '{found_guid}' for {tool_name}")
                            break

                    if found_guid:
                        arguments['templateId'] = found_guid
                    else:
                        logger.warning(f"⚠️  Template name '{template_name_or_id}' not found in any conversation mappings for {tool_name}")
                else:
                    logger.debug(f"✓ Template ID already looks like a GUID: {template_name_or_id}")

            response = await self._http_client.post(
                f"{self.base_url}/execute",
                json={
                    "tool": tool_name,
                    "parameters": arguments  # Server expects 'parameters' not 'arguments'
                }
            )
            response.raise_for_status()

            result = response.json()

            if not result.get("success"):
                error_msg = result.get("error", "Unknown error")
                logger.error(f"❌ Tool execution failed: {error_msg}")
                return {"error": error_msg, "success": False}

            logger.info(f"✅ Tool {tool_name} executed successfully")
            return result.get("data", result)  # Server returns 'data' not 'result'

        except httpx.HTTPStatusError as e:
            logger.error(f"❌ HTTP error executing {tool_name}: {e}")
            return {"error": f"HTTP {e.response.status_code}: {e.response.text}", "success": False}
        except Exception as e:
            logger.error(f"❌ Error executing {tool_name}: {e}")
            return {"error": str(e), "success": False}

    def convert_to_autogen_tools(self, tools: List[Dict[str, Any]]) -> List[FunctionTool]:
        """
        Convert WeSign tool definitions to AutoGen FunctionTool objects

        Args:
            tools: List of WeSign tool definitions with inputSchema

        Returns:
            List of AutoGen FunctionTool objects
        """
        autogen_tools = []

        for tool in tools:
            tool_name = tool.get("name")
            description = tool.get("description", "")
            input_schema = tool.get("inputSchema", {})

            if not tool_name:
                logger.warning(f"⚠️ Skipping tool without name: {tool}")
                continue

            if not input_schema or "properties" not in input_schema:
                logger.warning(f"⚠️ Skipping tool {tool_name}: missing inputSchema.properties")
                continue

            try:
                # Create wrapper function with proper schema
                wrapper_func = self._create_tool_wrapper(tool_name, input_schema)

                # Create FunctionTool
                function_tool = FunctionTool(
                    func=wrapper_func,
                    description=description
                )

                autogen_tools.append(function_tool)
                logger.debug(f"✅ Converted tool: {tool_name}")

            except Exception as e:
                logger.warning(f"⚠️ Could not convert tool {tool_name}: {e}")
                continue

        logger.info(f"✅ Successfully converted {len(autogen_tools)} / {len(tools)} tools")
        return autogen_tools

    def _create_tool_wrapper(self, tool_name: str, input_schema: Dict[str, Any]):
        """
        Create a wrapper function for a WeSign tool with proper signature

        Args:
            tool_name: Name of the tool
            input_schema: JSON Schema for tool parameters

        Returns:
            Wrapper function that executes the tool
        """
        # Get properties and required fields from schema
        properties = input_schema.get("properties", {})
        required_fields = input_schema.get("required", [])

        # Create base function
        async def tool_wrapper(**kwargs):
            """
            Dynamically created wrapper for WeSign tool

            This wrapper validates parameters and calls the WeSign MCP server
            """
            # Validate required parameters
            for field in required_fields:
                if field not in kwargs:
                    raise ValueError(f"Missing required parameter: {field}")

            # Execute the tool via HTTP REST API
            return await self.execute_tool(tool_name, kwargs)

        # Build proper function signature using inspect.Parameter
        params = []
        annotations = {}

        for param_name, param_def in properties.items():
            # Map JSON schema types to Python types
            param_type = param_def.get("type")
            if param_type == "string":
                python_type = str
            elif param_type == "integer":
                python_type = int
            elif param_type == "number":
                python_type = float
            elif param_type == "boolean":
                python_type = bool
            elif param_type == "array":
                python_type = list
            elif param_type == "object":
                python_type = dict
            else:
                python_type = Any

            annotations[param_name] = python_type

            # Create parameter with default value if optional
            if param_name in required_fields:
                param = inspect.Parameter(
                    param_name,
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    annotation=python_type
                )
            else:
                # Optional parameters get None as default
                default_value = param_def.get("default", None)
                param = inspect.Parameter(
                    param_name,
                    inspect.Parameter.POSITIONAL_OR_KEYWORD,
                    default=default_value,
                    annotation=python_type
                )

            params.append(param)

        # Create signature and attach to function
        sig = inspect.Signature(params)
        tool_wrapper.__signature__ = sig
        tool_wrapper.__annotations__ = annotations

        # Set function metadata
        tool_wrapper.__name__ = tool_name
        tool_wrapper.__doc__ = f"WeSign tool: {tool_name}\n\nParameters:\n"

        # Add parameter documentation
        for param_name, param_def in properties.items():
            param_type = param_def.get("type", "any")
            param_desc = param_def.get("description", "")
            required = " (required)" if param_name in required_fields else " (optional)"
            tool_wrapper.__doc__ += f"  - {param_name} ({param_type}){required}: {param_desc}\n"

        return tool_wrapper

    async def get_autogen_tools(self) -> List[FunctionTool]:
        """
        Fetch tools from WeSign and convert to AutoGen format

        Returns:
            List of AutoGen FunctionTool objects
        """
        tools = await self.fetch_tools()
        if not tools:
            logger.warning("⚠️ No tools fetched from WeSign MCP server")
            return []

        return self.convert_to_autogen_tools(tools)

    async def check_health(self) -> bool:
        """
        Check if WeSign MCP server is healthy

        Returns:
            True if server is accessible and healthy
        """
        try:
            response = await self._http_client.get(f"{self.base_url}/health")
            response.raise_for_status()
            data = response.json()
            is_healthy = data.get("status") == "ok"

            if is_healthy:
                logger.info("✅ WeSign MCP server is healthy")
            else:
                logger.warning("⚠️ WeSign MCP server health check failed")

            return is_healthy

        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
            return False

    async def close(self):
        """Clean up HTTP client"""
        await self._http_client.aclose()
        logger.info("🔒 WeSignMCPClient closed")


async def create_wesign_tools(base_url: str = None) -> tuple[WeSignMCPClient, List[FunctionTool]]:
    """
    Convenience function to create WeSign MCP client and fetch tools

    Args:
        base_url: Optional base URL for WeSign MCP server

    Returns:
        Tuple of (client, tools list)
    """
    client = WeSignMCPClient(base_url)

    # Check health first
    is_healthy = await client.check_health()
    if not is_healthy:
        logger.warning("⚠️ WeSign MCP server health check failed - continuing with 0 tools")
        return client, []

    # Fetch and convert tools
    tools = await client.get_autogen_tools()
    logger.info(f"✅ WeSign MCP integration ready with {len(tools)} tools")

    return client, tools
