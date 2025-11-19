"""
Configuration Constants for WeSign AI Assistant

This module contains all configuration constants used throughout the application.
Centralizing constants improves maintainability and makes the codebase easier to configure.
"""

import os
from typing import List


# ============================================================================
# File Upload Configuration
# ============================================================================

# Maximum file size in bytes (25 MB)
MAX_FILE_SIZE_MB = 25
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Allowed MIME types for file uploads
ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/jpg'
]

# ============================================================================
# Audio/Speech Configuration
# ============================================================================

# Allowed audio MIME types for speech-to-text
ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/mpeg',
    'audio/mpga',
    'audio/m4a',
    'audio/wav',
    'audio/webm',
    'audio/x-wav',
    'audio/wave'
]

# Maximum audio file size (25 MB - Whisper API limit)
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024

# ============================================================================
# Session Configuration
# ============================================================================

# Session token expiration time in hours
SESSION_TOKEN_EXPIRY_HOURS = int(os.getenv("SESSION_TOKEN_EXPIRY_HOURS", "24"))

# ============================================================================
# Rate Limiting Configuration
# ============================================================================

# Rate limits per endpoint (requests per minute)
RATE_LIMIT_CHAT = "10/minute"
RATE_LIMIT_UPLOAD = "20/minute"
RATE_LIMIT_SPEECH = "5/minute"
RATE_LIMIT_LOGIN = "5/minute"

# ============================================================================
# CORS Configuration
# ============================================================================

# Allowed origins for CORS (comma-separated in env var)
def get_allowed_origins() -> List[str]:
    """Get allowed CORS origins from environment variable"""
    origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:8000")
    return [origin.strip() for origin in origins_str.split(",")]


ALLOWED_ORIGINS = get_allowed_origins()

# Allowed HTTP methods
ALLOWED_METHODS = ["GET", "POST", "OPTIONS"]

# Allowed HTTP headers
ALLOWED_HEADERS = ["Content-Type", "Authorization"]

# ============================================================================
# API Configuration
# ============================================================================

# OpenAI model for agents
DEFAULT_MODEL = "gpt-4-turbo-preview"

# Temperature for LLM responses
DEFAULT_TEMPERATURE = 0.7

# ============================================================================
# MCP Configuration
# ============================================================================

# WeSign MCP server URL
WESIGN_MCP_URL = os.getenv("WESIGN_MCP_URL", "http://localhost:3000")

# WeSign backend URL
WESIGN_BACKEND_URL = os.getenv("WESIGN_BACKEND_URL", "https://devtest.comda.co.il")

# Default template fetch limit
DEFAULT_TEMPLATE_LIMIT = 100

# ============================================================================
# Server Configuration
# ============================================================================

# Server host and port
SERVER_HOST = os.getenv("HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("PORT", "8000"))

# ============================================================================
# Logging Configuration
# ============================================================================

# Log file path
LOG_FILE = "orchestrator.log"

# Log level
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ============================================================================
# Orchestrator Version
# ============================================================================

ORCHESTRATOR_VERSION = "v2.9-security-fixes-2025-11-19"
