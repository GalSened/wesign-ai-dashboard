# WeSign AI Assistant - Complete Documentation

🤖 **Intelligent Multi-Agent System for Document Management & Digital Signatures**

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![AutoGen 0.7.5](https://img.shields.io/badge/AutoGen-0.7.5-green.svg)](https://microsoft.github.io/autogen/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)](https://fastapi.tiangolo.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991.svg)](https://openai.com/)

## 🌟 Overview

WeSign AI Assistant is a sophisticated multi-agent orchestration system built with AutoGen v0.7.5, featuring **native MCP (Model Context Protocol) integration**, **voice-to-text capabilities**, and **official OpenAI ChatKit Python SDK** for seamless AI-powered document workflows.

### Key Features

✅ **5 Specialized AI Agents** - Document, Signing, Template, Admin, and FileSystem agents
✅ **Native MCP Integration** - AutoGen v0.7.5 with built-in MCP protocol support
✅ **14 FileSystem Tools** - Secure local file operations with MCP
✅ **WeSign MCP Server** - HTTP-based MCP for document operations (configurable)
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

### 1. Multi-Agent System (5 Specialists)

| Agent | Purpose | MCP Tools |
|-------|---------|-----------|
| **DocumentAgent** | Upload, list, manage documents | WeSign MCP |
| **SigningAgent** | Create & complete digital signatures | WeSign MCP |
| **TemplateAgent** | Manage and use document templates | WeSign MCP |
| **AdminAgent** | General assistance and guidance | None |
| **FileSystemAgent** | Browse and select local files | FileSystem MCP (14 tools) |

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

### 3. FileSystem MCP Tools (14 Available)

Secure file system operations:

- `list_allowed_directories` - Show accessible directories
- `list_directory` - List directory contents
- `read_file` - Read file contents
- `read_multiple_files` - Batch file reading
- `write_file` - Create/update files
- `create_directory` - Create new directories
- `move_file` - Move/rename files
- `search_files` - Search by pattern
- `get_file_info` - Get file metadata
- ... and 5 more!

**Security**: Only accesses allowed directories:
- `~/Documents`
- `~/Downloads`
- `/tmp/wesign-assistant`

### 4. WeSign MCP Server (HTTP-based) 🌐

**Configuration:**
- Server URL: `http://localhost:3000` (configurable via `WESIGN_MCP_URL`)
- Protocol: HTTP with StreamableHttpServerParams
- Graceful fallback when server unavailable
- Ready for document operations, signing workflows, template management

**Status**: Enabled and ready for testing (start WeSign MCP server to activate tools)

### 5. Intelligent Agent Selection

Automatic routing based on user intent:

```python
"List files in Documents" → FileSystemAgent
"Sign this document" → SigningAgent
"Show my templates" → TemplateAgent
"Help me get started" → AdminAgent
```

---

## 📦 Prerequisites

- **Python 3.9+** (3.12 recommended)
- **Node.js 16+** (for MCP FileSystem server)
- **OpenAI API Key** (required)
- **4GB RAM** (8GB recommended)
- **Modern web browser** (for voice features)

---

## 🚀 Quick Start

### 1. Clone & Setup

```bash
cd /path/to/your/projects
git clone <repository-url>
cd wesign-ai-dashboard/orchestrator

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env  # or vim/code .env
```

**Required configuration:**

```bash
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE

# FileSystem MCP Configuration
FILESYSTEM_ALLOWED_DIRS=$HOME/Documents,$HOME/Downloads,/tmp/wesign-assistant

# WeSign MCP Configuration (Optional - for document operations)
WESIGN_MCP_URL=http://localhost:3000

# Server Configuration
HOST=0.0.0.0
PORT=8000
```

### 3. Start the System

**Option A: Use startup script (recommended)**

```bash
cd /path/to/wesign-ai-dashboard
./scripts/start-all.sh
```

**Option B: Manual start**

```bash
cd orchestrator
source venv/bin/activate
python main.py
```

**Expected Output:**
```
🤖 Initializing AutoGen agents with native MCP...
🔧 Initializing WeSign MCP server...
📡 Connecting to WeSign MCP at: http://localhost:3000
⚠️  WeSign MCP unavailable - continuing with 0 tools (start WeSign server to enable)
🗂️  Initializing FileSystem MCP server...
✅ FileSystem MCP: 14 tools available
📁 Allowed directories: ['/Users/you/Documents', '/Users/you/Downloads', '/tmp/wesign-assistant']
✅ Initialized 5 agents with 2 MCP tool categories
🚀 Starting FastAPI server...
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 4. Access the Application

- **🌐 ChatKit UI**: http://localhost:8000/ui
- **🏥 Health Check**: http://localhost:8000/health
- **📚 API Docs**: http://localhost:8000/docs
- **🔧 API Root**: http://localhost:8000/

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
