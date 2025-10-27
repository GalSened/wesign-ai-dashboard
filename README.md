# WeSign AI Assistant Dashboard

A conversational AI assistant for WeSign document signing workflows, powered by AutoGen multi-agent system and Model Context Protocol (MCP).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WeSign AI Dashboard                     │
│                                                             │
│  ┌─────────────┐        ┌──────────────────────────┐      │
│  │   Frontend  │───────▶│  AutoGen Orchestrator    │      │
│  │  (Browser)  │        │  (Python FastAPI)        │      │
│  │             │        │                          │      │
│  │  - Chat UI  │        │  - Document Agent        │      │
│  │  - File     │        │  - Signing Agent         │      │
│  │    Upload   │        │  - Template Agent        │      │
│  └─────────────┘        │  - Admin Agent           │      │
│                         └──────────┬───────────────┘      │
│                                    │                        │
│                                    ▼                        │
│                         ┌──────────────────┐               │
│                         │  WeSign MCP      │               │
│                         │  Server          │               │
│                         │  (Node.js)       │               │
│                         │                  │               │
│                         │  - Auth Tools    │               │
│                         │  - Document Tools│               │
│                         │  - Signing Tools │               │
│                         │  - Template Tools│               │
│                         └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Frontend (port 8080)
- Clean dashboard UI with AI assistant button
- Chat interface with file upload
- Real-time communication with orchestrator

### 2. AutoGen Orchestrator (port 8000)
- Multi-agent system with specialized agents
- Document management agent
- Signing workflow agent
- Template management agent
- Administrative agent
- Intelligent agent selection based on user intent

### 3. WeSign MCP Server (port 3000)
- Model Context Protocol server for WeSign operations
- Authentication and user management
- Document upload and management
- Digital signature workflows
- Template creation and usage

## Prerequisites

- **Node.js** (v18+) for MCP server
- **Python** (v3.9+) for orchestrator
- **OpenAI API Key** for AI agents
- **WeSign Account** (optional for full features)

## Quick Start

### 1. Clone and Setup

The WeSign MCP server should already be cloned at `~/wesign-mcp-server`.

### 2. Configure Environment

Create the orchestrator environment file:

```bash
cd ~/wesign-ai-dashboard/orchestrator
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
OPENAI_API_KEY=your-openai-api-key-here
WESIGN_MCP_URL=http://localhost:3000

# WeSign auto-login (recommended)
WESIGN_EMAIL=your-email@example.com
WESIGN_PASSWORD=your-password
```

**Auto-Login:** The orchestrator automatically logs in to WeSign on startup, ensuring the AI assistant has authenticated access when opened from your dashboard.

### 3. Make Scripts Executable

```bash
cd ~/wesign-ai-dashboard
chmod +x *.sh
```

### 4. Start All Services

```bash
./start-all.sh
```

This will start:
- WeSign MCP Server on `http://localhost:3000`
- AutoGen Orchestrator on `http://localhost:8000`
- Frontend Dashboard on `http://localhost:8080`

### 5. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:8080
```

Click the **AI Assistant** button in the bottom right corner to start chatting!

## Manual Setup (Alternative)

### Start Services Individually

```bash
# Terminal 1: MCP Server
./start-mcp-server.sh

# Terminal 2: Orchestrator
./start-orchestrator.sh

# Terminal 3: Frontend
./start-frontend.sh
```

### Stop All Services

```bash
./stop-all.sh
```

## Usage Examples

### Document Upload
```
User: "Upload this contract for me"
[Attach PDF file]

AI: "I'll upload your contract to WeSign..."
✅ Document uploaded successfully!
```

### Create Self-Signing Document
```
User: "Create a self-signing document with this file"
[Attach PDF]

AI: "I'll create a self-signing workflow for you..."
✅ Self-signing document created!
```

### Add Signature Fields
```
User: "Add a signature field at page 1, position 100x200"

AI: "I'll add the signature field..."
✅ Signature field added successfully!
```

### List Templates
```
User: "Show me available templates"

AI: "Here are your WeSign templates..."
📄 Contract Template
📄 NDA Template
📄 Agreement Template
```

## Features

✅ **Conversational AI Interface**
- Natural language processing
- Context-aware responses
- File upload support

✅ **Multi-Agent System**
- Specialized agents for different tasks
- Intelligent agent selection
- Collaborative problem solving

✅ **WeSign Integration**
- Full document management
- Digital signature workflows
- Template management
- User authentication

✅ **Developer Friendly**
- Clear architecture
- Easy setup with scripts
- Comprehensive logging
- MCP protocol standardization

## Project Structure

```
wesign-ai-dashboard/
├── frontend/              # Frontend dashboard
│   ├── index.html        # Main HTML
│   ├── styles.css        # Styling
│   └── app.js            # Client-side logic
├── orchestrator/         # Python AutoGen service
│   ├── main.py           # FastAPI server
│   ├── orchestrator.py   # Agent system
│   ├── mcp_client.py     # MCP client
│   ├── requirements.txt  # Dependencies
│   └── .env.example      # Config template
├── start-all.sh          # Start all services
├── stop-all.sh           # Stop all services
├── start-mcp-server.sh   # Start MCP server
├── start-orchestrator.sh # Start orchestrator
├── start-frontend.sh     # Start frontend
└── README.md             # This file
```

## Logging

View logs in real-time:

```bash
# Frontend logs
tail -f logs/frontend.log

# Orchestrator logs
tail -f logs/orchestrator.log

# MCP Server logs
tail -f logs/mcp-server.log
```

## Troubleshooting

### Port Already in Use

If you see port conflicts, stop all services:

```bash
./stop-all.sh
```

### MCP Server Not Responding

Check if the MCP server is running:

```bash
curl http://localhost:3000/tools
```

### Orchestrator Errors

Check if the `.env` file is configured:

```bash
cat orchestrator/.env
```

Make sure `OPENAI_API_KEY` is set.

### Frontend Not Loading

Make sure Python HTTP server is running on port 8080:

```bash
lsof -i :8080
```

## Development

### Adding New Tools to MCP Server

1. Add tool implementation in `~/wesign-mcp-server/src/tools/`
2. Register tool in MCP server
3. Restart MCP server

### Adding New Agents

1. Edit `orchestrator/orchestrator.py`
2. Add new agent creation method
3. Register agent in `initialize()` method
4. Restart orchestrator

### Customizing UI

Edit `frontend/index.html`, `frontend/styles.css`, or `frontend/app.js` and refresh the browser.

## Security Notes

⚠️ **This is a demo/POC version**

For production use:
- Add proper authentication
- Secure API endpoints
- Use HTTPS
- Validate all user inputs
- Implement rate limiting
- Add proper error handling
- Use environment-specific configs

## API Endpoints

### Orchestrator API

- `GET /` - Service info
- `GET /health` - Health check
- `POST /api/upload` - Upload file
- `POST /api/chat` - Send message to AI
- `GET /api/tools` - List MCP tools

### MCP Server API

- `GET /tools` - List all tools
- `POST /execute` - Execute tool

## Contributing

This is a proof-of-concept demo. For production use, please review security considerations and add proper authentication.

## License

MIT

## Support

For issues related to:
- **WeSign MCP Server**: https://github.com/GalSened/wesign-mcp-server
- **AutoGen**: https://github.com/microsoft/autogen
- **MCP Protocol**: https://modelcontextprotocol.io

---

**Built with ❤️ using AutoGen and Model Context Protocol**
