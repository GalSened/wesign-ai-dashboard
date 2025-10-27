# Quick Setup Guide

## ⚡ Fast Start (5 minutes)

### 1. Configure API Keys and Credentials

```bash
cd ~/wesign-ai-dashboard/orchestrator
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
OPENAI_API_KEY=sk-your-actual-key-here
WESIGN_MCP_URL=http://localhost:3000

# WeSign auto-login credentials
WESIGN_EMAIL=your-email@example.com
WESIGN_PASSWORD=your-password
```

**Note:** The orchestrator will automatically login to WeSign on startup using these credentials, so the AI assistant has authenticated access when you open it from the dashboard.

### 2. Start Everything

```bash
cd ~/wesign-ai-dashboard
./start-all.sh
```

This will start all three services:
- WeSign MCP Server (port 3000)
- AutoGen Orchestrator (port 8000)
- Frontend Dashboard (port 8080)

### 3. Open Dashboard

Navigate to: **http://localhost:8080**

Click the **AI Assistant** button (bottom right) and start chatting!

---

## 🎯 Try These Commands

Once the AI assistant is open, try:

### Document Management
- "List my documents"
- "Upload this file" (attach a PDF)
- "Show me document details for [document-id]"

### Signing Workflows
- "Create a self-signing document" (attach PDF)
- "Add a signature field at page 1, position 100x200"
- "Complete the signing process"

### Templates
- "Show me available templates"
- "Create a template from this file" (attach PDF)
- "Use template [template-id] to create a new document"

### General
- "What can you help me with?"
- "Check my WeSign account status"
- "Show me my user information"

---

## 🛑 Stop Services

```bash
cd ~/wesign-ai-dashboard
./stop-all.sh
```

---

## 🔍 View Logs

```bash
# All logs are in the logs/ directory
tail -f logs/orchestrator.log
tail -f logs/mcp-server.log
tail -f logs/frontend.log
```

---

## ⚠️ Common Issues

### "OPENAI_API_KEY not found"
Make sure you created `.env` and added your API key in `orchestrator/.env`

### "Port already in use"
Stop all services: `./stop-all.sh` then restart

### "MCP Server not responding"
Check if WeSign MCP server is running:
```bash
curl http://localhost:3000/tools
```

---

## 📁 Project Structure

```
wesign-ai-dashboard/
├── frontend/              # Browser UI (port 8080)
├── orchestrator/          # Python AI agents (port 8000)
├── start-all.sh          # Start everything
├── stop-all.sh           # Stop everything
└── logs/                 # Service logs
```

WeSign MCP Server is located at:
```
~/wesign-mcp-server/      # Node.js MCP server (port 3000)
```

---

## 🚀 What's Next?

1. **Test the AI assistant** - Upload a document and ask it to create a self-signing workflow
2. **Review logs** - Check `logs/orchestrator.log` to see agent interactions
3. **Customize agents** - Edit `orchestrator/orchestrator.py` to add new capabilities
4. **Add tools to MCP** - Extend `~/wesign-mcp-server/src/tools/` with new WeSign operations

---

For detailed documentation, see **README.md**
