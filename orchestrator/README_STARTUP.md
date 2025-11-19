# WeSign AI Assistant - Startup Protocol

## Problem Solved

This startup protocol ensures that services start in the correct order to prevent the "0 tools loaded" issue where the orchestrator starts before the MCP server is ready.

## What Was Wrong

When the orchestrator starts before the MCP server:
- Orchestrator initializes with **0 tools available**
- Agents can't execute WeSign tools (list_contacts, list_templates, etc.)
- Users see tool names like "wesign_list_contacts" instead of actual data

## The Solution

The startup scripts ensure this order:

1. **Stop** any existing processes (clean slate)
2. **Start MCP Server FIRST** on port 3000
3. **Wait** for MCP health check to pass
4. **Start Orchestrator** (now connects and loads 46 tools)
5. **Wait** for Orchestrator health check
6. **Verify** MCP tools are loaded
7. **Open** browser to login page

## Usage

### Windows PowerShell (Recommended)
```powershell
cd C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator
.\Start-WeSignAI.ps1
```

### Windows Batch
```batch
cd C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator
start_wesign_ai.bat
```

### To Stop Services
```powershell
.\Stop-WeSignAI.ps1
```
or
```batch
stop_wesign_ai.bat
```

## What to Expect

### Successful Startup
```
[1/5] Cleaning up existing processes...
    ✓ Cleanup complete

[2/5] Starting WeSign MCP HTTP Server...
    ✓ MCP Server starting...

[3/5] Waiting for MCP Server health check...
    ✓ MCP Server is healthy!

[4/5] Starting WeSign AI Orchestrator...
    ✓ Orchestrator starting...

[5/5] Waiting for Orchestrator health check...
    ✓ Orchestrator is healthy!

✓ MCP Tools detected in orchestrator

🎉 WeSign AI Assistant is Ready!

Services Running:
  • WeSign MCP Server:  http://localhost:3000
  • AI Orchestrator:    http://localhost:8000
  • Login Page:         http://localhost:8000/login
  • Chat Interface:     http://localhost:8000/ui
```

### Verify Tools Are Loaded

Check orchestrator health:
```bash
curl http://localhost:8000/health
```

Should show:
```json
{
  "mcp_tools": {
    "wesign": 46  // <-- Should be 46, not 0!
  }
}
```

Check MCP server tools:
```bash
curl http://localhost:3000/tools
```

Should show:
```json
{
  "success": true,
  "count": 46,
  "tools": [...]
}
```

## When to Use

Use these startup scripts whenever you need to:
- Start the system fresh
- Restart after a code change
- Fix the "0 tools" issue
- Ensure clean initialization

## Current Session

Your current session is still running with:
- MCP Server: ✅ 46 tools available
- Orchestrator: ⚠️ 0 tools (started before MCP was ready)

The next time you restart using the startup scripts, the orchestrator will properly load all 46 WeSign tools.
