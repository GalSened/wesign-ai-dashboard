"""
MCP Client for communicating with WeSign MCP Server
"""

import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class MCPClient:
    """Client for calling WeSign MCP server tools"""

    def __init__(self, server_url: str):
        """
        Initialize MCP client

        Args:
            server_url: Base URL of the WeSign MCP server
        """
        self.server_url = server_url.rstrip('/')
        self.client = httpx.AsyncClient(timeout=60.0)

    async def list_tools(self) -> Dict[str, Any]:
        """
        List all available tools from MCP server

        Returns:
            Dict with tools list and count
        """
        try:
            response = await self.client.get(f"{self.server_url}/")
            response.raise_for_status()
            data = response.json()
            return {"success": True, "count": data.get("tools_count", 0), "data": data}
        except Exception as e:
            logger.error(f"Failed to list tools: {e}")
            return {"success": False, "tools": [], "count": 0}

    async def execute_tool(
        self,
        tool_name: str,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a tool on the MCP server

        Args:
            tool_name: Name of the tool to execute
            parameters: Tool parameters

        Returns:
            Tool execution result
        """
        try:
            payload = {
                "tool": tool_name,
                "parameters": parameters or {}
            }

            logger.info(f"🔧 Executing tool: {tool_name}")
            logger.debug(f"Parameters: {parameters}")

            response = await self.client.post(
                f"{self.server_url}/execute",
                json=payload
            )

            response.raise_for_status()
            result = response.json()

            if not result.get("success", False):
                logger.error(f"Tool execution failed: {result.get('error')}")

            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error executing tool {tool_name}: {e}")
            return {
                "success": False,
                "error": f"HTTP {e.response.status_code}: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

    # Convenience methods for common WeSign operations

    async def login(self, email: str, password: str, persistent: bool = False):
        """Login to WeSign"""
        return await self.execute_tool("wesign_login", {
            "email": email,
            "password": password,
            "persistent": persistent
        })

    async def check_auth(self):
        """Check authentication status"""
        return await self.execute_tool("wesign_check_auth")

    async def list_documents(self, offset: int = 0, limit: int = 50):
        """List user documents"""
        return await self.execute_tool("wesign_list_documents", {
            "offset": offset,
            "limit": limit
        })

    async def upload_document(self, file_path: str, name: Optional[str] = None):
        """Upload a document"""
        return await self.execute_tool("wesign_upload_document", {
            "filePath": file_path,
            "name": name
        })

    async def create_self_sign(self, file_path: str, name: Optional[str] = None):
        """Create self-signing document"""
        return await self.execute_tool("wesign_create_self_sign", {
            "filePath": file_path,
            "name": name
        })

    async def add_signature_fields(
        self,
        document_collection_id: str,
        document_id: str,
        fields: list
    ):
        """Add signature fields to document"""
        return await self.execute_tool("wesign_add_signature_fields", {
            "documentCollectionId": document_collection_id,
            "documentId": document_id,
            "fields": fields
        })

    async def complete_signing(
        self,
        document_collection_id: str,
        document_id: str,
        save_path: Optional[str] = None
    ):
        """Complete signing process"""
        return await self.execute_tool("wesign_complete_signing", {
            "documentCollectionId": document_collection_id,
            "documentId": document_id,
            "savePath": save_path
        })

    async def list_templates(self, offset: int = 0, limit: int = 50):
        """List available templates"""
        return await self.execute_tool("wesign_list_templates", {
            "offset": offset,
            "limit": limit
        })

    async def create_template(
        self,
        file_path: str,
        name: str,
        description: Optional[str] = None
    ):
        """Create a template"""
        return await self.execute_tool("wesign_create_template", {
            "filePath": file_path,
            "name": name,
            "description": description
        })

    async def use_template(self, template_id: str, document_name: str):
        """Create document from template"""
        return await self.execute_tool("wesign_use_template", {
            "templateId": template_id,
            "documentName": document_name
        })

    async def get_user_info(self):
        """Get current user information"""
        return await self.execute_tool("wesign_get_user_info")

    async def get_document_info(self, document_collection_id: str):
        """Get document information"""
        return await self.execute_tool("wesign_get_document_info", {
            "documentCollectionId": document_collection_id
        })
