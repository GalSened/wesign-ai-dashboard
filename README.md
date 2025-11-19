# WeSign AI Assistant - Complete Documentation

🤖 **Intelligent Multi-Agent System for Document Management & Digital Signatures**

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![AutoGen 0.7.5](https://img.shields.io/badge/AutoGen-0.7.5-green.svg)](https://microsoft.github.io/autogen/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)](https://fastapi.tiangolo.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991.svg)](https://openai.com/)

## 🌟 Overview

WeSign AI Assistant is a sophisticated multi-agent orchestration system built with AutoGen v0.7.5, featuring **native MCP (Model Context Protocol) integration**, **voice-to-text capabilities**, and **official OpenAI ChatKit Python SDK** for seamless AI-powered document workflows.

### Key Features

✅ **4 Specialized AI Agents** - Document, Signing, Template, and Admin agents
✅ **Native MCP Integration** - AutoGen v0.7.5 with built-in MCP protocol support
✅ **Drag-and-Drop File Upload** - Upload documents directly from browser (PDF, Word, Excel, Images)
✅ **WeSign MCP Server** - HTTP-based MCP for document operations with 50+ tools
✅ **Voice-to-Text** - OpenAI Whisper API integration for voice commands
✅ **OpenAI GPT-4** - Powered by state-of-the-art language model
✅ **Official ChatKit Python SDK** - OpenAI's official ChatKit server implementation
✅ **Modern Web UI** - Responsive chat interface with real-time agent interaction
✅ **RESTful API** - FastAPI with automatic OpenAPI documentation

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     WeSign AI Assistant                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐         ┌─────────────────────────┐    │
│  │  ChatKit UI    │────────▶│   FastAPI Backend       │    │
│  │  :8000/ui      │         │   Port 8000             │    │
│  │  + Voice 🎤    │         │   + Whisper API         │    │
│  └────────────────┘         └───────────┬─────────────┘    │
│                                          │                    │
│                              ┌───────────▼─────────────┐    │
│                              │  WeSign Orchestrator    │    │
│                              │  + Native MCP           │    │
│                              └───────────┬─────────────┘    │
│                                          │                    │
│                    ┌─────────────────────┼──────────────┐   │
│          ┌─────────▼───────┐  ┌─────────▼────┐  ┌─────▼───┐
│          │  5 AI Agents    │  │  OpenAI      │  │   MCP   │
│          │  (Specialists)  │  │  GPT-4       │  │ Servers │
│          └─────────────────┘  └──────────────┘  └──────────┘
│               │ Agent Routing                    ├─ FileSystem (14 tools)
│               │                                  └─ WeSign (HTTP)
└─────────────────────────────────────────────────────────────┘
```

### Native MCP Integration ✨

**Migrated from custom MCP client to AutoGen native MCP:**

```python
# ✅ NEW: Native AutoGen MCP (orchestrator_new.py)
from autogen_ext.tools.mcp import StdioServerParams, StreamableHttpServerParams, mcp_server_tools

# FileSystem MCP (stdio-based)
filesystem_params = StdioServerParams(
    command="npx",
    args=["-y", "@modelcontextprotocol/server-filesystem"] + allowed_dirs
)
tools = await mcp_server_tools(filesystem_params)

# WeSign MCP (HTTP-based)
wesign_params = StreamableHttpServerParams(url="http://localhost:3000")
wesign_tools = await mcp_server_tools(wesign_params)

# Attach to agents
agent = AssistantAgent(tools=tools)
```

**Benefits:**
- ⚡ Automatic tool discovery and registration
- 🔒 Type-safe tool execution
- 🛠️ Built-in error handling
- 📦 Simpler architecture
- 🚀 Better performance
- 🌐 Support for both stdio and HTTP-based MCP servers

### Official OpenAI ChatKit Integration 🎯

**Production-ready chat interface powered by OpenAI's ChatKit Python SDK:**

The system integrates the official `openai-chatkit` package for enterprise-grade chat functionality:

**Backend Architecture:**
```python
# chatkit_server.py - Official ChatKit Server Implementation
from chatkit.server import ChatKitServer
from chatkit.types import ThreadStreamEvent, UserMessageItem, AssistantMessageItem

class WeSignChatKitServer(ChatKitServer):
    """ChatKit server that bridges to AutoGen multi-agent orchestrator"""

    async def respond(self, thread, input_user_message, context):
        # Process through AutoGen orchestrator
        result = await self.orchestrator.process_message(...)

        # Stream back via ChatKit events
        yield ThreadItemAddedEvent(item=assistant_item)
        yield ThreadItemDoneEvent(item=assistant_item)
```

**Frontend Options:**

1. **Official ChatKit UI** (Current Implementation)
   - Location: `frontend/official-chatkit.html`
   - CDN: `https://cdn.platform.openai.com/deployments/chatkit/chatkit.js`
   - Access: http://localhost:8000/ui

2. **React ChatKit** (Alternative for Advanced Features)
   - Package: `@openai/chatkit-react`
   - Best for: Custom servers with complex workflows
   - Installation: `npm install @openai/chatkit-react`

**Key Components:**

| Component | Purpose | Location |
|-----------|---------|----------|
| `chatkit_server.py` | ChatKit server implementation | orchestrator/ |
| `chatkit_store.py` | Conversation persistence | orchestrator/ |
| `official-chatkit.html` | Official ChatKit UI | frontend/ |
| `/chatkit` endpoint | ChatKit communication (SSE) | main.py:281 |
| `/ui` endpoint | Serve ChatKit UI | main.py:147 |

**Communication Flow:**

```
User Message → ChatKit UI → /chatkit endpoint → ChatKitServer.respond()
→ AutoGen Orchestrator → AI Agents → MCP Tools → Response Stream
→ Server-Sent Events → ChatKit UI → User
```

**Features:**
- ✅ Real-time streaming responses via SSE
- ✅ Thread-based conversation management
- ✅ File upload support
- ✅ Tool call visibility
- ✅ Multi-agent orchestration
- ✅ Persistent conversation history

**Official Documentation:**
- [ChatKit Python SDK](https://openai.github.io/chatkit-python/server/)
- [ChatKit JavaScript](https://openai.github.io/chatkit-js/)
- [ChatKit Authentication](https://openai.github.io/chatkit-js/guides/authentication)

---

## ✨ Features

### 1. Multi-Agent System (4 Specialists)

| Agent | Purpose | MCP Tools |
|-------|---------|-----------|
| **DocumentAgent** | Upload, list, manage documents | WeSign MCP (50+ tools) |
| **SigningAgent** | Create & complete digital signatures | WeSign MCP (50+ tools) |
| **TemplateAgent** | Manage and use document templates | WeSign MCP (50+ tools) |
| **AdminAgent** | General assistance and guidance | None |

**Note:** FileSystemAgent has been replaced with browser-based drag-and-drop file upload for better security and user experience.

### 2. Voice-to-Text Integration 🎤

**OpenAI Whisper API-powered voice commands:**

- 🎙️ Click microphone button to record voice
- 🔊 Speak your command naturally
- ✅ Auto-transcription using Whisper API
- 📝 Text appears in input field for review/edit
- 🚀 Send transcribed message to AI assistant

**Supported Audio Formats:**
- WAV, MP3, MP4, M4A, MPEG, MPGA, WEBM
- Maximum file size: 25MB

**Voice Flow:**
```
User Voice → MediaRecorder API → Audio Blob → /api/speech-to-text
→ OpenAI Whisper API → Transcribed Text → Input Field → User Review → Send
```

**Browser Requirements:**
- Chrome 47+, Firefox 25+, Edge 79+, Safari 14.1+
- HTTPS connection (or localhost for development)
- Microphone permissions

**See**: `VOICE_FEATURE_DOCUMENTATION.md` for complete implementation details

### 3. Drag-and-Drop File Upload 📎

Browser-based secure file upload without filesystem access:

**Features:**
- 🖱️ Drag and drop files directly onto chat interface
- 📂 Browse files using file picker
- ✅ Real-time file validation (type and size)
- 📊 Upload progress tracking
- 🗑️ Individual file removal or clear all
- 💾 Automatic server-side storage
- 🔒 No direct filesystem access required

**Supported File Types:**
- PDF documents (.pdf)
- Word documents (.doc, .docx)
- Excel spreadsheets (.xls, .xlsx)
- Images (.png, .jpg, .jpeg)

**Security:**
- ✅ Client-side validation before upload
- ✅ Server-side validation and virus scanning
- ✅ Temporary storage with auto-cleanup
- ✅ 25MB file size limit
- ✅ No direct filesystem browsing (sandbox security)

### 4. WeSign MCP Server (HTTP-based) 🌐

**Configuration:**
- Server URL: `http://localhost:3000` (configurable via `WESIGN_MCP_URL`)
- Protocol: HTTP with StreamableHttpServerParams
- 50+ WeSign tools available
- Ready for document operations, signing workflows, template management

**Status**: Enabled and operational (requires WeSign MCP server running on port 3000)

### 5. Intelligent Agent Selection

Automatic routing based on user intent:

```python
"Upload this document" → DocumentAgent
"Sign this document" → SigningAgent
"Show my templates" → TemplateAgent
"Help me get started" → AdminAgent
"List my documents" → DocumentAgent
```

---

## 📦 Prerequisites

- **Python 3.9+** (3.12 recommended)
- **Node.js 16+** (for MCP FileSystem server)
- **OpenAI API Key** (required)
- **4GB RAM** (8GB recommended)
- **Modern web browser** (for voice features)

---

## 🚀 Step-by-Step Launch Guide

Follow these steps to launch the WeSign AI Assistant system from scratch:

### Step 1: Prerequisites Check ✅

Before starting, ensure you have:

```bash
# Check Python version (3.9+ required, 3.12 recommended)
python --version

# Check Node.js version (16+ required for WeSign MCP)
node --version

# Check Git
git --version
```

**Required:**
- ✅ Python 3.9+ (3.12 recommended)
- ✅ Node.js 16+ (for WeSign MCP Server)
- ✅ OpenAI API Key ([Get one here](https://platform.openai.com/api-keys))
- ✅ 4GB RAM minimum (8GB recommended)
- ✅ Modern web browser (Chrome, Firefox, Edge, or Safari)

### Step 2: Clone Repository 📦

```bash
# Navigate to your projects directory
cd /path/to/your/projects

# Clone the repository
git clone https://github.com/GalSened/wesign-ai-dashboard.git

# Enter project directory
cd wesign-ai-dashboard
```

### Step 3: Start WeSign MCP Server 🌐

**Terminal 1 - WeSign MCP Server:**

```bash
# Navigate to WeSign MCP Server directory
cd /c/Users/gals/Desktop/wesign-mcp-server

# Install dependencies (first time only)
npm install

# Start the WeSign MCP Server on port 3000
node dist/mcp-http-server.js
```

**Expected output:**
```
🚀 WeSign MCP Server running on http://localhost:3000
✅ Ready to accept connections
```

**Keep this terminal running** - the server must stay active for WeSign features.

### Step 4: Setup Python Environment 🐍

**Terminal 2 - Main Application:**

```bash
# Navigate to orchestrator directory
cd /path/to/wesign-ai-dashboard/orchestrator

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

# Upgrade pip
python -m pip install --upgrade pip

# Install all dependencies
pip install -r requirements.txt
```

**Expected output:**
```
Successfully installed autogen-agentchat-0.7.5 autogen-core-0.7.5 autogen-ext-0.7.5 ...
```

### Step 5: Configure Environment Variables 🔧

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your preferred editor
# Windows:
notepad .env

# macOS/Linux:
nano .env
```

**Required configuration in `.env`:**

```bash
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE

# WeSign MCP Server Configuration
WESIGN_MCP_URL=http://localhost:3000

# WeSign Credentials (for auto-login in UI)
WESIGN_EMAIL=your-email@example.com
WESIGN_PASSWORD=your-password

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

**⚠️ Important:**
- Replace `sk-proj-YOUR-ACTUAL-KEY-HERE` with your real OpenAI API key
- Replace email/password with your WeSign credentials
- Never commit `.env` to version control

### Step 6: Start the Orchestrator 🚀

**In Terminal 2 (with venv activated):**

```bash
# Make sure you're in the orchestrator directory
cd /path/to/wesign-ai-dashboard/orchestrator

# Start the FastAPI server
python main.py
```

**Expected output:**
```
🚀 ORCHESTRATOR_NEW.PY LOADED - WITH DRAG-AND-DROP + REFLECTION PATTERN
📍 File: orchestrator_new.py (NOT orchestrator.py)
✨ Features: Hebrew/English support + Drag-and-drop file upload + Response formatting
🤖 Initializing AutoGen agents with WeSign MCP...

🔧 Initializing WeSign MCP server...
📡 Connecting to WeSign MCP at: http://localhost:3000
✅ WeSign MCP: [X] tools available

✅ Initialized 5 agents with WeSign MCP tools:
   👤 Admin Agent: General assistance and guidance
   📄 Document Agent: Upload and manage documents (WeSign tools)
   ✍️  Signing Agent: Create and complete signatures (WeSign tools)
   📋 Template Agent: Manage document templates (WeSign tools)
   📁 Filesystem Agent (REMOVED - use drag-and-drop instead)

🌟 MCP Tools Available:
   📡 WeSign tools: [X]
   🎯 Ready for document operations!

🚀 Starting FastAPI server...
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXX] using WatchFiles
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Keep this terminal running** - this is your main application server.

### Step 7: Access the Application 🌐

Open your web browser and navigate to:

- **🌐 Main UI (Login)**: http://localhost:8000/login
- **💬 Chat Interface**: http://localhost:8000/ui (after login)
- **🏥 Health Check**: http://localhost:8000/health
- **📚 API Docs**: http://localhost:8000/docs

### Step 8: Login to WeSign 🔐

1. Open http://localhost:8000/login
2. Enter your WeSign credentials:
   - Email: The email from your `.env` file
   - Password: The password from your `.env` file
3. Check "Keep me signed in" (optional)
4. Click "Sign In to WeSign"

**Expected:** Redirects to http://localhost:8000/ui (Chat Interface)

### Step 9: Verify System Status ✅

**Test 1 - Health Check:**
```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "version": "v2.9-drag-and-drop-2025-11-19",
  "orchestrator": "orchestrator_new.py",
  "agents": {
    "total_agents": 5,
    "agents": ["admin", "document", "signing", "template"]
  },
  "mcp_integration": {
    "wesign": {
      "status": "connected",
      "url": "http://localhost:3000",
      "tools_count": 50
    }
  }
}
```

**Test 2 - Available Tools:**
```bash
curl http://localhost:8000/api/tools
```

**Test 3 - Chat in Browser:**

In the chat interface at http://localhost:8000/ui, try:

```
💬 "Hello! What can you help me with?"
💬 "List my recent documents"
💬 "Show me my templates"
```

### Step 10: Test File Upload 📎

1. In the chat interface, look for the drag-and-drop zone
2. Drag a PDF, Word, or Excel file onto the zone
3. See the file appear in the "Attached Files" section
4. Send a message: "Please summarize this document"
5. The AI will process the uploaded file

**Supported file types:**
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- Images (.png, .jpg, .jpeg)

**File size limit:** 25MB per file

### Step 11: Optional - Voice Input 🎤

1. Click the microphone button (🎤) in the chat interface
2. Allow microphone permissions when prompted
3. Speak your command clearly
4. Click stop (⏹️) when finished
5. Review the transcribed text
6. Click Send or press Enter

---

## 🎯 Quick Reference

### Starting the System (After Initial Setup)

**Every time you want to use the system:**

```bash
# Terminal 1 - WeSign MCP Server
cd /c/Users/gals/Desktop/wesign-mcp-server
node dist/mcp-http-server.js

# Terminal 2 - Main Application
cd /path/to/wesign-ai-dashboard/orchestrator
venv\Scripts\activate  # Windows
# OR: source venv/bin/activate  # macOS/Linux
python main.py
```

**Then open:** http://localhost:8000/login

### Stopping the System

```bash
# In Terminal 1 (WeSign MCP):
Ctrl+C

# In Terminal 2 (Main Application):
Ctrl+C
```

### Application URLs

| URL | Purpose |
|-----|---------|
| http://localhost:8000/login | Login page |
| http://localhost:8000/ui | Main chat interface (after login) |
| http://localhost:8000/health | System health check |
| http://localhost:8000/docs | API documentation |
| http://localhost:3000 | WeSign MCP Server |

---

## 🎯 Usage Examples

### Web UI (ChatKit)

Open http://localhost:8000/ui in your browser and try:

```
💬 "List files in my Documents folder"
💬 "Read the first 20 lines of README.md in Downloads"
💬 "Help me sign a document"
💬 "Show me available templates"
💬 "What can you help me with?"
```

**Voice Input:**
1. Click microphone button 🎤
2. Allow microphone permissions
3. Speak your command
4. Click stop button ⏹️
5. Review transcribed text
6. Click send or press Enter

### API Usage

**Health Check:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0-native-mcp",
  "mcp_integration": "native_autogen",
  "agents": {
    "total_agents": 5,
    "agents": ["document", "signing", "template", "admin", "filesystem"],
    "conversations": 0,
    "mcp_tools": {
      "wesign": 0,
      "filesystem": 14
    }
  }
}
```

**Send Chat Message:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "List files in my Documents",
    "context": {
      "userId": "user-123",
      "companyId": "company-456",
      "userName": "John Doe"
    }
  }'
```

**List Available Tools:**
```bash
curl http://localhost:8000/api/tools
```

**Response:**
```json
{
  "count": 14,
  "categories": {
    "wesign": 0,
    "filesystem": 14
  },
  "integration_type": "native_autogen_mcp",
  "tools": {
    "filesystem": [
      "list_allowed_directories",
      "list_directory",
      "read_file",
      "read_multiple_files",
      "write_file",
      "create_directory",
      "move_file",
      "search_files",
      "get_file_info",
      "..."
    ]
  }
}
```

**Voice Transcription:**
```bash
# Record audio file first, then:
curl -X POST http://localhost:8000/api/speech-to-text \
  -H "Content-Type: multipart/form-data" \
  -F "file=@recording.wav"
```

**Response:**
```json
{
  "text": "List files in my Documents folder",
  "filename": "recording.wav",
  "size": 123456
}
```

---

## 📡 API Documentation

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info and status |
| `/health` | GET | Health check with agent status |
| `/ui` | GET | Serve ChatKit UI |
| `/official-chatkit.html` | GET | Serve official OpenAI ChatKit UI |
| `/api/chat` | POST | Send message to AI assistant |
| `/api/speech-to-text` | POST | Voice-to-text transcription (Whisper API) |
| `/api/tools` | GET | List available MCP tools |
| `/api/upload` | POST | Upload file for processing |
| `/api/chatkit/session` | POST | Create ChatKit authentication session |
| `/api/chatkit-client-token` | POST | Legacy ChatKit token endpoint |
| `/api/chatkit-status` | GET | ChatKit server statistics |
| `/chatkit` | ALL | ChatKit communication endpoint (SSE) |
| `/docs` | GET | OpenAPI documentation |

### Chat API Request

```json
{
  "message": "string",
  "context": {
    "userId": "string",
    "companyId": "string",
    "userName": "string",
    "conversationId": "string (optional)"
  },
  "files": [
    {
      "fileId": "string",
      "fileName": "string",
      "filePath": "string"
    }
  ]
}
```

### Chat API Response

```json
{
  "response": "string",
  "conversationId": "string",
  "toolCalls": [
    {
      "tool": "string",
      "action": "string",
      "parameters": {},
      "result": "string"
    }
  ],
  "metadata": {
    "agent": "string",
    "user_name": "string",
    "files_count": 0
  }
}
```

### Speech-to-Text API

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `file` (audio file)

**Response:**
```json
{
  "text": "Transcribed text from audio",
  "filename": "recording.wav",
  "size": 12345
}
```

**Errors:**
- 400: File too large (max 25MB) or empty file
- 500: Transcription failed (check OPENAI_API_KEY)

---

## 🔒 Security

### FileSystem MCP Security

- ✅ **Sandboxed Access**: Only allowed directories are accessible
- ✅ **Path Validation**: All paths are validated before access
- ✅ **No System Directories**: Cannot access `/etc`, `/usr`, `/var`
- ✅ **User Confirmation**: FileSystemAgent confirms paths with users

### Configuration Best Practices

```bash
# ✅ GOOD: Specific user directories
FILESYSTEM_ALLOWED_DIRS=$HOME/Documents,$HOME/Downloads

# ❌ BAD: System directories
FILESYSTEM_ALLOWED_DIRS=/etc,/usr,/var

# ❌ BAD: Root directory
FILESYSTEM_ALLOWED_DIRS=/
```

### API Key Security

- ✅ Store API keys in `.env` (never commit to git)
- ✅ Add `.env` to `.gitignore`
- ✅ Use environment variables in production
- ✅ Rotate keys regularly
- ✅ Voice transcriptions processed server-side (API key never exposed to frontend)

### Voice Feature Security

- ✅ Temporary audio files created in isolated directory
- ✅ Automatic cleanup after transcription
- ✅ Path validation prevents directory traversal
- ✅ OpenAI API key stored server-side only
- ✅ No audio data logged or persisted

---

## 🛠️ Development

### Project Structure

```
wesign-ai-dashboard/
├── orchestrator/               # Main FastAPI application
│   ├── main.py                # FastAPI server & routes
│   ├── orchestrator_new.py    # AutoGen orchestrator with native MCP
│   ├── chatkit_server.py      # ChatKit integration
│   ├── chatkit_store.py       # ChatKit storage
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables (gitignored)
│   ├── .env.example           # Environment template
│   └── venv/                  # Python virtual environment
├── frontend/                   # Web UI
│   ├── official-chatkit.html  # Official OpenAI ChatKit UI
│   └── chatkit-index.html     # Legacy custom UI (deprecated)
├── scripts/                    # Utility scripts
│   ├── start-all.sh           # Complete startup script
│   └── start-filesystem-mcp.sh # FileSystem MCP standalone
├── tests/                      # Test suites
│   └── e2e/                   # End-to-end tests
│       └── wesign-assistant.spec.js  # Playwright E2E tests
├── VOICE_FEATURE_DOCUMENTATION.md  # Voice feature details
├── TEST_RESULTS_REPORT.md     # MCP testing evidence
└── README.md                   # This file
```

### Key Files Explained

**orchestrator_new.py** (436 lines):
- WeSignOrchestrator class with native MCP
- 5 specialized agent creation methods
- MCP server initialization (FileSystem + WeSign)
- Message processing and agent routing
- Tool call extraction and response formatting

**main.py** (700+ lines):
- FastAPI application setup
- All API endpoints
- ChatKit integration endpoints
- Voice transcription endpoint
- File upload handling
- Health checks and monitoring

**chatkit_server.py**:
- WeSignChatKitServer class
- OpenAI ChatKit server implementation
- AutoGen orchestrator bridge
- Server-sent events streaming

**chatkit_store.py**:
- In-memory conversation storage (dev-only)
- Thread and message management
- User context tracking

### Testing

**1. Health Check:**
```bash
curl http://localhost:8000/health | python3 -m json.tool
```

**2. Tools Verification:**
```bash
curl http://localhost:8000/api/tools | python3 -m json.tool
```

**3. Chat Integration:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!","context":{"userId":"test","companyId":"test","userName":"Test"}}' \
  | python3 -m json.tool
```

**4. UI Manual Testing:**
Open http://localhost:8000/ui and verify:
- ✅ UI loads correctly
- ✅ Status shows "Connected"
- ✅ Health check succeeds
- ✅ Can send text messages
- ✅ Receives AI responses
- ✅ Voice button visible (🎤)
- ✅ Microphone permissions work
- ✅ Voice recording functions
- ✅ Transcription works

**5. E2E Testing (Playwright):**
```bash
cd tests/e2e
npm install
npx playwright test wesign-assistant.spec.js
```

**Test Coverage:**
- UI loading and elements
- Text message sending/receiving
- Voice recording button visibility
- Empty message handling
- Health check requests
- Agent routing (filesystem queries)
- Special character safety
- Network request monitoring

**See**: `TEST_RESULTS_REPORT.md` for comprehensive test results with evidence

---

## 🐛 Troubleshooting

### Problem: "ModuleNotFoundError: No module named 'autogen_agentchat'"

**Solution:**
```bash
cd orchestrator
source venv/bin/activate
pip install autogen-agentchat autogen-core autogen-ext[mcp]
```

### Problem: "Address already in use" (port 8000)

**Solution:**
```bash
# Find and kill process using port 8000
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use shorter version
lsof -ti:8000 | xargs kill -9
```

### Problem: OpenAI API Error "Invalid API Key"

**Solution:**
1. Check API key in `.env` is correct
2. Visit https://platform.openai.com/api-keys
3. Generate new key if needed
4. Update `.env` with new key: `OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE`
5. Restart orchestrator: `python main.py`

### Problem: FileSystem MCP Error "Directory not found"

**Solution:**
```bash
# Create required directories
mkdir -p ~/Documents ~/Downloads /tmp/wesign-assistant

# Update .env with correct paths
FILESYSTEM_ALLOWED_DIRS=$HOME/Documents,$HOME/Downloads,/tmp/wesign-assistant

# Restart orchestrator
python main.py
```

### Problem: UI Not Loading

**Solution:**
1. Check server is running: `curl http://localhost:8000/health`
2. Check frontend directory exists: `ls -la frontend/`
3. Verify `chatkit-index.html` exists
4. Check browser console for errors (F12 → Console)
5. Clear browser cache and reload

### Problem: Voice Recording Not Working

**Solution:**
1. Check microphone permissions in browser
2. Verify HTTPS or localhost connection (required for MediaRecorder API)
3. Test microphone in system settings
4. Check browser console for errors
5. Verify OPENAI_API_KEY in `.env`
6. Check backend logs for transcription errors

### Problem: "Transcription failed" Error

**Solution:**
1. Verify OPENAI_API_KEY in `.env` file
2. Check audio file format (WAV, MP3, etc.)
3. Verify file size < 25MB
4. Check backend logs: `python main.py` output
5. Test API directly: `curl -X POST http://localhost:8000/api/speech-to-text`

### Problem: WeSign MCP Shows 0 Tools

**Solution:**
This is expected if WeSign MCP server is not running. To enable:
1. Start WeSign MCP server on port 3000
2. Set `WESIGN_MCP_URL=http://localhost:3000` in `.env`
3. Restart orchestrator
4. Check logs for "✅ WeSign MCP: X tools available"

**Note**: System continues to work with FileSystem MCP (14 tools) even if WeSign MCP unavailable.

### Problem: Agent Routes to Wrong Specialist

**Solution:**
Be more specific with keywords:
- ✅ "List files in Documents" → FileSystemAgent
- ✅ "Sign this document" → SigningAgent
- ✅ "Show templates" → TemplateAgent
- ❌ "Help with file" → May route to AdminAgent (ambiguous)

**Routing Keywords:**
- FileSystem: "file", "browse", "list files", "read file"
- Signing: "sign", "signature", "signing"
- Template: "template", "templates"
- Document: "upload", "document", "pdf"

---

## 🚀 Server Deployment Guide

Deploy WeSign AI Assistant to a production server (Linux/Ubuntu).

### Files to Manually Transfer

When deploying to a server, these files are **NOT in git repositories** and must be transferred manually:

#### 1. Environment Configuration Files 🔐

**wesign-ai-dashboard/orchestrator/.env**
```bash
OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY
WESIGN_MCP_URL=http://localhost:3000
WESIGN_EMAIL=your-email@example.com
WESIGN_PASSWORD=your-password
HOST=0.0.0.0
PORT=8000
```

**wesign-mcp-server/.env** (if exists)
```bash
PORT=3000
# Any other WeSign-specific environment variables
```

#### 2. WeSign MCP Server Build Files

The `dist/` folder is gitignored. You have two options:

**Option A: Transfer pre-built files**
```bash
# Copy entire dist/ folder from local machine
scp -r wesign-mcp-server/dist/ user@server:/opt/wesign-mcp-server/
```

**Option B: Build on server (recommended)**
```bash
# After cloning, build on server:
cd /opt/wesign-mcp-server
npm install
npm run build
```

### Step-by-Step Server Deployment

#### Step 1: Prepare Server Environment

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx git curl

# Install Node.js 18+ (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
python3 --version  # Should be 3.9+
node --version     # Should be 16+
npm --version
```

#### Step 2: Clone Repositories

```bash
# Create deployment directory
sudo mkdir -p /opt
cd /opt

# Clone wesign-ai-dashboard
sudo git clone https://github.com/GalSened/wesign-ai-dashboard.git
sudo chown -R $USER:$USER wesign-ai-dashboard

# Clone wesign-mcp-server (adjust URL to your repo)
sudo git clone <your-wesign-mcp-server-repo-url>
sudo chown -R $USER:$USER wesign-mcp-server
```

#### Step 3: Transfer Environment Files Securely

```bash
# From your local machine, use SCP
scp orchestrator/.env user@server:/opt/wesign-ai-dashboard/orchestrator/.env

# Or create directly on server
nano /opt/wesign-ai-dashboard/orchestrator/.env
# Paste your configuration and save
```

#### Step 4: Setup WeSign MCP Server

```bash
cd /opt/wesign-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Verify dist/ folder exists
ls -la dist/

# Install PM2 for process management
sudo npm install -g pm2

# Start WeSign MCP Server
pm2 start dist/mcp-http-server.js --name wesign-mcp

# Configure PM2 to start on boot
pm2 save
pm2 startup
# Follow the command output instructions

# Check status
pm2 status
pm2 logs wesign-mcp
```

#### Step 5: Setup Python Orchestrator

```bash
cd /opt/wesign-ai-dashboard/orchestrator

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Test the application
python main.py
# Press Ctrl+C to stop after verifying it starts
```

#### Step 6: Create Systemd Service for Orchestrator

```bash
# Create systemd service file
sudo nano /etc/systemd/system/wesign-orchestrator.service
```

Paste this configuration:

```ini
[Unit]
Description=WeSign AI Orchestrator
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/wesign-ai-dashboard/orchestrator
Environment="PATH=/opt/wesign-ai-dashboard/orchestrator/venv/bin"
ExecStart=/opt/wesign-ai-dashboard/orchestrator/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Set permissions
sudo chown -R www-data:www-data /opt/wesign-ai-dashboard

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable wesign-orchestrator

# Start service
sudo systemctl start wesign-orchestrator

# Check status
sudo systemctl status wesign-orchestrator

# View logs
sudo journalctl -u wesign-orchestrator -f
```

#### Step 7: Configure Firewall

```bash
# Allow required ports
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH (if not already enabled)

# Internal ports (only if accessing from outside)
# sudo ufw allow 8000/tcp  # Orchestrator (not recommended, use Nginx)
# sudo ufw allow 3000/tcp  # WeSign MCP (not recommended, use Nginx)

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

#### Step 8: Setup Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/wesign
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Increase max body size for file uploads
    client_max_body_size 25M;

    # Main application
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WeSign MCP Server (if needed externally)
    location /mcp/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/wesign /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

#### Step 9: Setup SSL with Let's Encrypt (Production)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Follow the prompts
# Certbot will automatically configure Nginx for HTTPS

# Test auto-renewal
sudo certbot renew --dry-run

# Certificate will auto-renew
```

#### Step 10: Verify Deployment

```bash
# Check all services
pm2 status                              # WeSign MCP Server
sudo systemctl status wesign-orchestrator  # Orchestrator
sudo systemctl status nginx             # Nginx

# Check health endpoint
curl http://localhost:8000/health
curl http://your-domain.com/health

# Check logs
pm2 logs wesign-mcp
sudo journalctl -u wesign-orchestrator -f
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### Step 11: Monitor and Maintain

```bash
# View orchestrator logs
sudo journalctl -u wesign-orchestrator -f

# View WeSign MCP logs
pm2 logs wesign-mcp

# Restart services
sudo systemctl restart wesign-orchestrator
pm2 restart wesign-mcp

# Update application
cd /opt/wesign-ai-dashboard
git pull
sudo systemctl restart wesign-orchestrator

cd /opt/wesign-mcp-server
git pull
npm install
npm run build
pm2 restart wesign-mcp
```

### Server Deployment Checklist

- [ ] Server has Python 3.9+, Node.js 16+, Nginx
- [ ] Both repositories cloned to `/opt/`
- [ ] `.env` files transferred securely
- [ ] WeSign MCP Server built and running (PM2)
- [ ] Python dependencies installed in venv
- [ ] Orchestrator running as systemd service
- [ ] Firewall configured (ports 80, 443)
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Health endpoints responding correctly
- [ ] Logs being monitored
- [ ] Auto-start on reboot configured

### Production Best Practices

1. **Security:**
   - Use HTTPS in production (SSL certificates)
   - Keep `.env` files secure (600 permissions)
   - Use secrets management (e.g., HashiCorp Vault)
   - Regularly update dependencies
   - Enable firewall with minimal open ports

2. **Monitoring:**
   - Setup log rotation: `sudo nano /etc/logrotate.d/wesign`
   - Monitor disk space for uploaded files
   - Setup health check monitoring (UptimeRobot, etc.)
   - Configure alerts for service failures

3. **Backups:**
   - Backup `.env` files regularly
   - Backup uploaded files directory
   - Backup database (if applicable)
   - Document server configuration

4. **Performance:**
   - Use a CDN for static assets
   - Enable Nginx caching
   - Monitor resource usage (CPU, RAM, disk)
   - Scale horizontally if needed (load balancer)

### Common Server Issues

**Issue: Port 8000 already in use**
```bash
sudo lsof -i :8000
sudo kill -9 <PID>
sudo systemctl restart wesign-orchestrator
```

**Issue: Permission denied**
```bash
sudo chown -R www-data:www-data /opt/wesign-ai-dashboard
sudo chmod 600 /opt/wesign-ai-dashboard/orchestrator/.env
```

**Issue: Service won't start**
```bash
sudo journalctl -u wesign-orchestrator -n 50
sudo systemctl status wesign-orchestrator
```

**Issue: Nginx 502 Bad Gateway**
```bash
# Check orchestrator is running
sudo systemctl status wesign-orchestrator
curl http://localhost:8000/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 System Status

**Current Version**: 2.0.0-native-mcp
**MCP Integration**: native_autogen_mcp
**AutoGen Version**: 0.7.5
**Python Version**: 3.9+ (3.12 recommended)
**FastAPI Version**: 0.104+
**OpenAI SDK Version**: 1.0.0+

### Agents Status

- ✅ **DocumentAgent** - Ready (WeSign MCP tools)
- ✅ **SigningAgent** - Ready (WeSign MCP tools)
- ✅ **TemplateAgent** - Ready (WeSign MCP tools)
- ✅ **AdminAgent** - Ready (No tools needed)
- ✅ **FileSystemAgent** - Ready (14 tools available)

### MCP Servers Status

**FileSystem MCP:**
- Status: ✅ Operational
- Type: stdio-based (npx @modelcontextprotocol/server-filesystem)
- Tools: 14 available
- Directories: ~/Documents, ~/Downloads, /tmp/wesign-assistant

**WeSign MCP:**
- Status: ⚠️ Enabled, awaiting server startup
- Type: HTTP-based (StreamableHttpServerParams)
- URL: http://localhost:3000 (configurable)
- Tools: 0 (will populate when server starts)
- Fallback: Graceful (system continues with FileSystem MCP)

### Voice Features Status

- ✅ Whisper API Integration: Active
- ✅ Speech-to-Text Endpoint: /api/speech-to-text
- ✅ Supported Formats: WAV, MP3, MP4, M4A, MPEG, WEBM
- ✅ Max File Size: 25MB
- ✅ Browser Support: Chrome 47+, Firefox 25+, Edge 79+, Safari 14.1+

---

## 🚀 Performance Tips

### For Best Performance

1. **Use appropriate agent routing**:
   - Be specific with keywords to route to correct agent
   - FileSystem queries work best with explicit paths

2. **Optimize file operations**:
   - Keep allowed directories focused (avoid large directories)
   - Use specific file patterns in search queries
   - Read files in chunks for large files

3. **API usage**:
   - Reuse `conversationId` for multi-turn conversations
   - Use health check to verify system before operations
   - Monitor `/api/chatkit-status` for server load

4. **Voice input**:
   - Keep recordings under 60 seconds for fast transcription
   - Speak clearly for better accuracy
   - Use quiet environment to reduce background noise

---

## 📝 Development Notes

### Code Quality

- ✅ No mock implementations - all integrations are real
- ✅ Proper error handling and logging
- ✅ Type hints throughout codebase
- ✅ Comprehensive docstrings
- ✅ Security best practices followed

### Testing Coverage

- ✅ E2E tests with Playwright
- ✅ API endpoint testing
- ✅ MCP integration testing
- ✅ Voice feature testing
- ✅ Agent routing verification

See `TEST_RESULTS_REPORT.md` for detailed test results with evidence.

### Recent Updates

**Latest Commit (b9bd95d):**
- ✅ Enabled WeSign MCP server connection with HTTP support
- ✅ Added StreamableHttpServerParams for HTTP-based MCP
- ✅ Implemented graceful fallback when server unavailable
- ✅ Maintains 14 operational FileSystem MCP tools

**Voice Feature:**
- ✅ Full OpenAI Whisper API integration
- ✅ Browser audio recording with MediaRecorder API
- ✅ Auto-transcription with user review workflow
- ✅ Comprehensive error handling

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with clear commits
4. Test thoroughly (manual + E2E)
5. Update documentation if needed
6. Submit a pull request with detailed description

**Areas for Contribution:**
- Additional MCP server integrations
- Enhanced agent capabilities
- UI/UX improvements
- Test coverage expansion
- Performance optimizations
- Documentation improvements

---

## 📄 License

[Your License Here]

---

## 🔗 Links

### Official Documentation
- [AutoGen Documentation](https://microsoft.github.io/autogen/)
- [AutoGen v0.7.5 MCP Integration](https://microsoft.github.io/autogen/docs/packages/autogen-ext/tools/mcp/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI ChatKit Python SDK](https://openai.github.io/chatkit-python/)
- [OpenAI ChatKit JavaScript](https://openai.github.io/chatkit-js/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

### Project Documentation
- [Voice Feature Documentation](VOICE_FEATURE_DOCUMENTATION.md)
- [Test Results Report](TEST_RESULTS_REPORT.md)
- [API Documentation](http://localhost:8000/docs) (when server running)

---

## 💡 Tips & Best Practices

### For Users

- 🎯 Be specific in your requests to get better responses
- 📁 Organize files in allowed directories for easy access
- 🔄 Use conversation context for multi-step workflows
- ✅ Review tool calls before confirming actions
- 🎤 Use voice input for faster interaction
- 📝 Review transcribed text before sending

### For Developers

- 📚 Read AutoGen v0.7.5 documentation for latest features
- 🔧 Use native MCP when possible (simpler & more reliable)
- 🧪 Test agents individually before integration
- 📝 Keep `.env.example` updated with new variables
- 🔍 Monitor logs for debugging: `python main.py`
- 🛡️ Follow security best practices for API keys
- 📊 Use health endpoint to verify system state

### For Integration

- 🌐 Use `/api/chat` for text-based integration
- 🎤 Use `/api/speech-to-text` for voice features
- 📡 Monitor `/health` endpoint for system status
- 🔧 Check `/api/tools` to verify available tools
- 📖 Reference `/docs` for OpenAPI specification

---

## 📞 Support & Contact

For issues, questions, or contributions:
1. Check this README thoroughly
2. Review `VOICE_FEATURE_DOCUMENTATION.md` for voice features
3. Check `TEST_RESULTS_REPORT.md` for testing examples
4. Review backend logs: `python main.py` output
5. Check browser console: F12 → Console tab
6. Submit issue with detailed information

---

**Built with ❤️ using AutoGen v0.7.5, OpenAI GPT-4, Whisper API, and Model Context Protocol**

*Last Updated: 2025-10-28*
