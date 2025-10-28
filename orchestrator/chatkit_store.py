"""
In-Memory Store Implementation for ChatKit

This provides a simple in-memory implementation of the ChatKit Store interface
for demo purposes. For production, migrate to PostgreSQL or another persistent database.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class InMemoryStore:
    """
    Simple in-memory storage for ChatKit threads and messages.

    Note: This is for demo purposes only. Data will be lost on restart.
    For production, implement proper database persistence.
    """

    def __init__(self):
        self.threads: Dict[str, Dict[str, Any]] = {}
        self.messages: Dict[str, List[Dict[str, Any]]] = {}
        self.attachments: Dict[str, Dict[str, Any]] = {}
        logger.info("✅ Initialized in-memory ChatKit store")

    # Thread Management

    async def create_thread(self, thread_id: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create a new thread"""
        thread = {
            "id": thread_id,
            "created_at": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
            "message_count": 0
        }
        self.threads[thread_id] = thread
        self.messages[thread_id] = []
        logger.info(f"📝 Created thread: {thread_id}")
        return thread

    async def get_thread(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """Get thread by ID"""
        return self.threads.get(thread_id)

    async def update_thread(self, thread_id: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Update thread metadata"""
        if thread_id in self.threads:
            self.threads[thread_id]["metadata"].update(metadata)
            return self.threads[thread_id]
        return None

    async def list_threads(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """List all threads"""
        threads = list(self.threads.values())
        return threads[offset:offset + limit]

    # Message Management

    async def add_message(
        self,
        thread_id: str,
        message: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add a message to a thread"""
        if thread_id not in self.messages:
            # Auto-create thread if it doesn't exist
            await self.create_thread(thread_id)

        message_with_timestamp = {
            **message,
            "timestamp": datetime.utcnow().isoformat(),
            "thread_id": thread_id
        }

        self.messages[thread_id].append(message_with_timestamp)
        self.threads[thread_id]["message_count"] += 1

        logger.info(f"💬 Added message to thread {thread_id}")
        return message_with_timestamp

    async def get_messages(
        self,
        thread_id: str,
        limit: int = 100,
        before: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get messages from a thread"""
        if thread_id not in self.messages:
            return []

        messages = self.messages[thread_id]

        # Filter by before timestamp if provided
        if before:
            messages = [
                m for m in messages
                if m["timestamp"] < before
            ]

        # Return most recent messages first
        return list(reversed(messages[-limit:]))

    async def get_message(self, thread_id: str, message_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific message"""
        if thread_id not in self.messages:
            return None

        for message in self.messages[thread_id]:
            if message.get("id") == message_id:
                return message

        return None

    # Attachment Management

    async def store_attachment(
        self,
        attachment_id: str,
        file_name: str,
        file_path: str,
        content_type: str,
        size: int,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Store attachment metadata"""
        attachment = {
            "id": attachment_id,
            "file_name": file_name,
            "file_path": file_path,
            "content_type": content_type,
            "size": size,
            "created_at": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }

        self.attachments[attachment_id] = attachment
        logger.info(f"📎 Stored attachment: {file_name} ({attachment_id})")
        return attachment

    async def get_attachment(self, attachment_id: str) -> Optional[Dict[str, Any]]:
        """Get attachment metadata"""
        return self.attachments.get(attachment_id)

    async def delete_attachment(self, attachment_id: str) -> bool:
        """Delete attachment"""
        if attachment_id in self.attachments:
            del self.attachments[attachment_id]
            logger.info(f"🗑️ Deleted attachment: {attachment_id}")
            return True
        return False

    # Utility Methods

    def get_stats(self) -> Dict[str, int]:
        """Get storage statistics"""
        return {
            "threads": len(self.threads),
            "messages": sum(len(msgs) for msgs in self.messages.values()),
            "attachments": len(self.attachments)
        }

    async def clear(self):
        """Clear all data (for testing)"""
        self.threads.clear()
        self.messages.clear()
        self.attachments.clear()
        logger.warning("🧹 Cleared all ChatKit store data")
