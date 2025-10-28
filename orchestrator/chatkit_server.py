"""
ChatKit Server Implementation for WeSign

This bridges OpenAI ChatKit with the AutoGen multi-agent orchestrator,
allowing ChatKit UI to communicate with WeSign's custom agents.
"""

import logging
from typing import AsyncIterator, Dict, Any, Optional
from datetime import datetime
import uuid

# ChatKit imports (will be available after pip install openai-chatkit)
try:
    from chatkit.server import ChatKitServer
    from chatkit.types import (
        ThreadMetadata,
        UserMessageItem,
        AssistantMessageItem,
        AssistantMessageContent,
        ThreadStreamEvent,
        ThreadItemAddedEvent,
        ThreadItemDoneEvent,
        ErrorEvent
    )
except ImportError as e:
    # Fallback for type hints if package not yet installed
    logger = logging.getLogger(__name__)
    logger.warning(f"ChatKit not installed properly: {e}. Run: pip install openai-chatkit")
    raise

from chatkit_store import InMemoryStore

logger = logging.getLogger(__name__)


class WeSignChatKitServer(ChatKitServer):
    """
    ChatKit server implementation for WeSign AI Assistant.

    Bridges ChatKit UI with AutoGen multi-agent orchestrator.
    """

    def __init__(self, store: InMemoryStore, orchestrator):
        """
        Initialize ChatKit server

        Args:
            store: InMemoryStore instance for persistence
            orchestrator: WeSignOrchestrator instance for agent interactions
        """
        super().__init__(store)
        self.orchestrator = orchestrator
        self.active_runs: Dict[str, Dict[str, Any]] = {}

        logger.info("🤖 Initialized WeSignChatKitServer")

    async def respond(
        self,
        thread: ThreadMetadata,
        input_user_message: UserMessageItem | None,
        context: Dict[str, Any]
    ) -> AsyncIterator[ThreadStreamEvent]:
        """
        Handle user message and stream agent response

        Args:
            thread: ChatKit thread metadata object
            input_user_message: User's message (can be None for retry scenarios)
            context: Request context (auth, session, etc.)

        Yields:
            ThreadStreamEvent objects for streaming response
        """
        thread_id = thread.id

        if input_user_message is None:
            # Handle retry scenario
            logger.warning(f"No input message provided for thread {thread_id}")
            return

        message_text = self._extract_message_text(input_user_message)

        logger.info(f"💬 Processing message in thread {thread_id}: {message_text[:50]}...")

        # Track active processing
        run_id = str(uuid.uuid4())
        self.active_runs[run_id] = {
            "thread_id": thread_id,
            "status": "in_progress",
            "started_at": datetime.utcnow().isoformat()
        }

        try:
            # Extract user context from thread metadata or context
            user_id = context.get("user_id", "demo-user")
            company_id = context.get("company_id", "demo-company")
            user_name = context.get("user_name", "User")

            # Extract file attachments if any
            files = self._extract_attachments(input_user_message)

            # Create assistant message item
            message_id = str(uuid.uuid4())

            # Get orchestrator response
            result = await self.orchestrator.process_message(
                message=message_text,
                user_id=user_id,
                company_id=company_id,
                user_name=user_name,
                conversation_id=thread_id,
                files=files
            )

            response_text = result.get("response", "I processed your request.")
            tool_calls = result.get("tool_calls", [])

            # Create AssistantMessageItem with the response
            assistant_item = AssistantMessageItem(
                id=message_id,
                thread_id=thread_id,
                created_at=datetime.utcnow(),
                content=[
                    AssistantMessageContent(
                        text=response_text,
                        annotations=[]
                    )
                ]
            )

            # Yield thread item added event (message starts)
            yield ThreadItemAddedEvent(item=assistant_item)

            # Yield thread item done event (message completes)
            yield ThreadItemDoneEvent(item=assistant_item)

            # Update run status
            self.active_runs[run_id]["status"] = "completed"
            self.active_runs[run_id]["completed_at"] = datetime.utcnow().isoformat()

            logger.info(f"✅ Completed processing for thread {thread_id}")

        except Exception as e:
            logger.error(f"❌ Error processing message: {e}", exc_info=True)

            # Update run status to failed
            self.active_runs[run_id]["status"] = "failed"
            self.active_runs[run_id]["error"] = str(e)

            # Create error message item
            error_message_id = str(uuid.uuid4())
            error_text = f"I encountered an error: {str(e)}. Please try again."

            error_item = AssistantMessageItem(
                id=error_message_id,
                thread_id=thread_id,
                created_at=datetime.utcnow(),
                content=[
                    AssistantMessageContent(
                        text=error_text,
                        annotations=[]
                    )
                ]
            )

            # Yield error message events
            yield ThreadItemAddedEvent(item=error_item)
            yield ThreadItemDoneEvent(item=error_item)

            # Also yield explicit error event
            yield ErrorEvent(
                error=str(e),
                code="orchestrator_error"
            )

    def _extract_message_text(self, message: UserMessageItem) -> str:
        """Extract text content from user message"""
        # UserMessageItem.content is a list of UserMessageContent objects
        if hasattr(message, "content") and isinstance(message.content, list):
            text_parts = []
            for content_block in message.content:
                # Each content block has a 'text' attribute if it's UserMessageTextContent
                if hasattr(content_block, "text"):
                    text_parts.append(content_block.text)
                elif isinstance(content_block, dict) and "text" in content_block:
                    text_parts.append(content_block["text"])
            return " ".join(text_parts)

        return str(message)

    def _extract_attachments(self, message: UserMessageItem) -> list:
        """Extract file attachments from message"""
        attachments = []

        if isinstance(message, dict):
            files = message.get("attachments", [])
        elif hasattr(message, "attachments"):
            files = message.attachments or []
        else:
            return attachments

        for attachment in files:
            if isinstance(attachment, dict):
                attachments.append({
                    "fileId": attachment.get("id"),
                    "fileName": attachment.get("name"),
                    "filePath": attachment.get("url") or attachment.get("path"),
                    "contentType": attachment.get("content_type"),
                    "size": attachment.get("size")
                })

        return attachments

    async def get_thread_history(self, thread_id: str) -> list:
        """Get conversation history for a thread"""
        return await self.store.get_messages(thread_id)

    async def create_thread(self, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Create a new thread"""
        thread_id = str(uuid.uuid4())
        await self.store.create_thread(thread_id, metadata)
        return thread_id

    def get_server_status(self) -> Dict[str, Any]:
        """Get server status and statistics"""
        stats = self.store.get_stats()
        return {
            "status": "operational",
            "active_runs": len([r for r in self.active_runs.values() if r["status"] == "in_progress"]),
            "storage": stats,
            "orchestrator_agents": len(self.orchestrator.agents) if self.orchestrator else 0
        }
