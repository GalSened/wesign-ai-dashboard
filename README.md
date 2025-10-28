# WeSign AI Assistant - Complete Documentation

🤖 **Intelligent Multi-Agent System for Document Management & Digital Signatures**

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![AutoGen 0.7.5](https://img.shields.io/badge/AutoGen-0.7.5-green.svg)](https://microsoft.github.io/autogen/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)](https://fastapi.tiangolo.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991.svg)](https://openai.com/)

## 🌟 Overview

WeSign AI Assistant is a sophisticated multi-agent orchestration system built with AutoGen v0.7.5, featuring **native MCP (Model Context Protocol) integration** and **official OpenAI ChatKit Python SDK** for seamless AI-powered document workflows.

### Key Features

✅ **5 Specialized AI Agents** - Document, Signing, Template, Admin, and FileSystem agents
✅ **Native MCP Integration** - AutoGen v0.7.5 with built-in MCP protocol support
✅ **14 FileSystem Tools** - Secure local file operations with MCP
✅ **OpenAI GPT-4** - Powered by state-of-the-art language model
✅ **Official ChatKit Python SDK** - OpenAI's official ChatKit server implementation
✅ **Modern Web UI** - Responsive chat interface with real-time agent interaction
✅ **RESTful API** - FastAPI with automatic OpenAPI documentation

---

## 🏗️ Architecture

### System Overview

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                     WeSign AI Assistant                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐         ┌─────────────────────────┐    │
│  │  ChatKit UI    │────────▶│   FastAPI Backend       │    │
│  │  :8000/ui      │         │   Port 8000             │    │
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
│          │  (Specialists)  │  │  GPT-4       │  │  14 Tools│
│          └─────────────────┘  └──────────────┘  └──────────┘
│                                                               │
└─────────────────────────────────────────────────────────────┘
\`\`\`

### Native MCP Integration ✨

**Migrated from custom MCP client to AutoGen native MCP:**

\`\`\`python
# ✅ NEW: Native AutoGen MCP (orchestrator_new.py)
from autogen_ext.tools.mcp import StdioServerParams, mcp_server_tools

filesystem_params = StdioServerParams(
    command="npx",
    args=["-y", "@modelcontextprotocol/server-filesystem"] + allowed_dirs
)
tools = await mcp_server_tools(filesystem_params)
agent = AssistantAgent(tools=tools)
\`\`\`

**Benefits:**
- ⚡ Automatic tool discovery and registration
- 🔒 Type-safe tool execution
- 🛠️ Built-in error handling
- 📦 Simpler architecture
- 🚀 Better performance

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

### 2. FileSystem MCP Tools (14 Available)

Secure file system operations:

- \`list_allowed_directories\` - Show accessible directories
- \`list_directory\` - List directory contents
- \`read_file\` - Read file contents
- \`read_multiple_files\` - Batch file reading
- \`write_file\` - Create/update files
- \`create_directory\` - Create new directories
- \`move_file\` - Move/rename files
- \`search_files\` - Search by pattern
- \`get_file_info\` - Get file metadata
- ... and 5 more!

**Security**: Only accesses allowed directories:
- \`~/Documents\`
- \`~/Downloads\`
- \`/tmp/wesign-assistant\`

### 3. Intelligent Agent Selection

Automatic routing based on user intent:

\`\`\`python
"List files in Documents" → FileSystemAgent
"Sign this document" → SigningAgent
"Show my templates" → TemplateAgent
"Help me get started" → AdminAgent
\`\`\`

---

## 📦 Prerequisites

- **Python 3.9+**
- **Node.js 16+** (for MCP FileSystem server)
- **OpenAI API Key**
- **4GB RAM** (8GB recommended)

---

## 🚀 Quick Start

### 1. Clone & Setup

\`\`\`bash
cd /path/to/your/projects
git clone <repository-url>
cd wesign-ai-dashboard/orchestrator

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt
\`\`\`

### 2. Configure Environment

\`\`\`bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env  # or vim/code .env
\`\`\`

**Required configuration:**

\`\`\`bash
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE

# FileSystem MCP Configuration
FILESYSTEM_ALLOWED_DIRS=$HOME/Documents,$HOME/Downloads,/tmp/wesign-assistant

# Server Configuration
HOST=0.0.0.0
PORT=8000
\`\`\`

### 3. Start the System

**Option A: Use startup script (recommended)**

\`\`\`bash
cd /path/to/wesign-ai-dashboard
./scripts/start-all.sh
\`\`\`

**Option B: Manual start**

\`\`\`bash
cd orchestrator
source venv/bin/activate
python main.py
\`\`\`

### 4. Access the Application

- **🌐 ChatKit UI**: http://localhost:8000/ui
- **🏥 Health Check**: http://localhost:8000/health
- **📚 API Docs**: http://localhost:8000/docs
- **🔧 API Root**: http://localhost:8000/

---

## 🎯 Usage Examples

### Web UI (ChatKit)

Open http://localhost:8000/ui in your browser and try:

\`\`\`
💬 "List files in my Documents folder"
💬 "Help me sign a document"
💬 "Show me available templates"
💬 "What can you help me with?"
\`\`\`

### API Usage

**Health Check:**
\`\`\`bash
curl http://localhost:8000/health
\`\`\`

**Send Chat Message:**
\`\`\`bash
curl -X POST http://localhost:8000/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "List files in my Documents",
    "context": {
      "userId": "user-123",
      "companyId": "company-456",
      "userName": "John Doe"
    }
  }'
\`\`\`

**List Available Tools:**
\`\`\`bash
curl http://localhost:8000/api/tools
\`\`\`

---

## 📡 API Documentation

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/\` | GET | Service info and status |
| \`/health\` | GET | Health check with agent status |
| \`/ui\` | GET | Serve ChatKit UI |
| \`/api/chat\` | POST | Send message to AI assistant |
| \`/api/tools\` | GET | List available MCP tools |
| \`/api/upload\` | POST | Upload file for processing |
| \`/docs\` | GET | OpenAPI documentation |

### Chat API Request

\`\`\`json
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
\`\`\`

### Chat API Response

\`\`\`json
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
\`\`\`

---

## 🔒 Security

### FileSystem MCP Security

- ✅ **Sandboxed Access**: Only allowed directories are accessible
- ✅ **Path Validation**: All paths are validated before access
- ✅ **No System Directories**: Cannot access \`/etc\`, \`/usr\`, \`/var\`
- ✅ **User Confirmation**: FileSystemAgent confirms paths with users

### Configuration Best Practices

\`\`\`bash
# ✅ GOOD: Specific user directories
FILESYSTEM_ALLOWED_DIRS=$HOME/Documents,$HOME/Downloads

# ❌ BAD: System directories
FILESYSTEM_ALLOWED_DIRS=/etc,/usr,/var

# ❌ BAD: Root directory
FILESYSTEM_ALLOWED_DIRS=/
\`\`\`

### API Key Security

- ✅ Store API keys in \`.env\` (never commit to git)
- ✅ Add \`.env\` to \`.gitignore\`
- ✅ Use environment variables in production
- ✅ Rotate keys regularly

---

## 🛠️ Development

### Project Structure

\`\`\`
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
└── README.md                   # This file
\`\`\`

### Testing

**1. Test Health Endpoint:**
\`\`\`bash
curl http://localhost:8000/health | python3 -m json.tool
\`\`\`

**2. Test Tools Endpoint:**
\`\`\`bash
curl http://localhost:8000/api/tools | python3 -m json.tool
\`\`\`

**3. Test Chat Integration:**
\`\`\`bash
curl -X POST http://localhost:8000/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Hello!","context":{"userId":"test","companyId":"test","userName":"Test"}}' \\
  | python3 -m json.tool
\`\`\`

**4. Test UI:**
Open http://localhost:8000/ui and verify:
- ✅ UI loads correctly
- ✅ Status shows "Connected"
- ✅ Health check succeeds
- ✅ Can send messages
- ✅ Receives AI responses

---

## 🐛 Troubleshooting

### Problem: "ModuleNotFoundError: No module named 'autogen_agentchat'"

**Solution:**
\`\`\`bash
cd orchestrator
source venv/bin/activate
pip install autogen-agentchat autogen-core autogen-ext[mcp]
\`\`\`

### Problem: "Address already in use" (port 8000)

**Solution:**
\`\`\`bash
# Find and kill process using port 8000
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill -9
\`\`\`

### Problem: OpenAI API Error "Invalid API Key"

**Solution:**
1. Check API key in \`.env\` is correct
2. Visit https://platform.openai.com/api-keys
3. Generate new key if needed
4. Update \`.env\` with new key
5. Restart orchestrator

### Problem: FileSystem MCP Error "Directory not found"

**Solution:**
\`\`\`bash
# Create required directories
mkdir -p ~/Documents ~/Downloads /tmp/wesign-assistant

# Restart orchestrator
python main.py
\`\`\`

### Problem: UI Not Loading

**Solution:**
1. Check server is running: \`curl http://localhost:8000/health\`
2. Check frontend directory exists: \`ls -la frontend/\`
3. Verify \`chatkit-index.html\` exists
4. Check browser console for errors

---

## 📊 System Status

**Current Version**: 2.0.0-native-mcp  
**MCP Integration**: native_autogen  
**AutoGen Version**: 0.7.5  
**Python Version**: 3.9+  
**FastAPI Version**: 0.104+

### Agents Status

- ✅ **DocumentAgent** - Ready
- ✅ **SigningAgent** - Ready
- ✅ **TemplateAgent** - Ready
- ✅ **AdminAgent** - Ready
- ✅ **FileSystemAgent** - Ready (14 tools)

### MCP Tools Status

- ✅ **FileSystem MCP**: 14 tools available
- ⚠️ **WeSign MCP**: 0 tools (server has issues - expected)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

[Your License Here]

---

## 🔗 Links

- [AutoGen Documentation](https://microsoft.github.io/autogen/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

## 💡 Tips & Best Practices

### For Users

- 🎯 Be specific in your requests to get better responses
- 📁 Organize files in allowed directories for easy access
- 🔄 Use conversation context for multi-step workflows
- ✅ Review tool calls before confirming actions

### For Developers

- 📚 Read AutoGen v0.7.5 documentation for latest features
- 🔧 Use native MCP when possible (simpler & more reliable)
- 🧪 Test agents individually before integration
- 📝 Keep \`.env.example\` updated with new variables

---

**Built with ❤️ using AutoGen, OpenAI, and MCP**
