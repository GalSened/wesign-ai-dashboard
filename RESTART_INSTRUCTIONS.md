# After Restart - WeSign Contact Functionality Startup Guide

**Status**: All code complete and ready to test
**Date**: 2025-11-16
**Task**: Contact functionality with Hebrew/English bilingual support

---

## 🚀 Quick Start (After Restart)

### Step 1: Start MCP Server

```bash
cd C:\Users\gals\Desktop\wesign-mcp-server
node dist/server.js
```

**Expected Output**:
```
WeSign MCP Server listening on port 3000
Health check: http://localhost:3000/health
Tools list: http://localhost:3000/tools
```

### Step 2: Start Orchestrator (New Terminal)

```bash
cd C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator
venv\Scripts\python.exe main.py
```

**Expected Output**:
```
✅ Initialized 5 agents with 46 WeSign tools
✅ Successfully converted 46 / 46 tools
✅ ORCHESTRATOR_NEW.PY LOADED - WITH REFLECTION PATTERN
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Verify Single Process

```bash
netstat -ano | findstr :8000
```

**Expected**: Should show ONLY 1 line (not 7!)

### Step 4: Test English Contact Functionality

```bash
curl -X POST http://localhost:8000/api/chat -H "Content-Type: application/json" -d @C:\tmp\test_contact_english.json
```

**Expected Response**:
```json
{
  "response": "[Contact listing or action]",
  "metadata": {
    "agent": "contact"  // ✅ MUST be "contact", NOT "admin"
  }
}
```

### Step 5: Test Hebrew Contact Functionality

```bash
curl -X POST http://localhost:8000/api/chat -H "Content-Type: application/json" -d @C:\tmp\test_contact_hebrew.json
```

**Expected Response**:
```json
{
  "response": "[Hebrew response with contact listing]",
  "metadata": {
    "agent": "contact"  // ✅ MUST be "contact"
  }
}
```

---

## ✅ Verification Checklist

After startup:

- [ ] MCP server running on port 3000
- [ ] Orchestrator running on port 8000
- [ ] **ONLY 1 process on port 8000** (critical!)
- [ ] Log shows: "Initialized 5 agents with 46 WeSign tools"
- [ ] Log shows: "ORCHESTRATOR_NEW.PY LOADED"
- [ ] Health check works: `curl http://localhost:8000/health`
- [ ] English contact test routes to "contact" agent
- [ ] Hebrew contact test routes to "contact" agent

---

## 📁 File Locations

### Main Code:
- **Orchestrator**: `C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator\orchestrator_new.py`
- **Main Entry**: `C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator\main.py`
- **MCP Server**: `C:\Users\gals\Desktop\wesign-mcp-server\dist\server.js`

### Test Files:
- **English Test**: `C:\tmp\test_contact_english.json`
- **Hebrew Test**: `C:\tmp\test_contact_hebrew.json`

### Documentation:
- **Complete Guide**: `C:\Users\gals\WESIGN_CONTACT_IMPLEMENTATION_COMPLETE.md`
- **Status Report**: `C:\Users\gals\WESIGN_CONTACT_FUNCTIONALITY_STATUS.md`
- **This File**: `C:\Users\gals\source\repos\wesign-ai-dashboard\RESTART_INSTRUCTIONS.md`

---

## 🔧 What Was Implemented

### 5 Specialized Agents:
1. **Document Agent** - Document management
2. **Signing Agent** - Signature workflows
3. **Template Agent** - Template operations
4. **Contact Agent** - Contact management ⭐ **NEW**
5. **Admin Agent** - General administration

### 46 WeSign MCP Tools:
- 34 existing tools (document, signing, template, admin)
- **12 new contact tools** ⭐:
  1. `wesign_create_contact`
  2. `wesign_create_contacts_bulk`
  3. `wesign_list_contacts`
  4. `wesign_get_contact`
  5. `wesign_update_contact`
  6. `wesign_delete_contact`
  7. `wesign_delete_contacts_batch`
  8. `wesign_list_contact_groups`
  9. `wesign_get_contact_group`
  10. `wesign_create_contact_group`
  11. `wesign_update_contact_group`
  12. `wesign_delete_contact_group`

### Contact Keywords (English & Hebrew):
- English: "contact", "contacts", "address book", "create contact"
- Hebrew: "איש קשר", "אנשי קשר", "ספר כתובות", "קבוצה", "קבוצת"

---

## 🎯 How It Works

1. **User sends message**: "Show me all my contacts" or "הצג לי את אנשי הקשר"
2. **Orchestrator detects keywords**: "contacts" or "אנשי קשר"
3. **Routes to contact agent**: Agent has access to all 12 contact tools
4. **Contact agent uses tools**: Calls MCP server via HTTP
5. **MCP server executes**: WeSign API operations
6. **Response formatted**: In appropriate language (Hebrew/English)
7. **Returns to user**: With metadata showing agent used

---

## 🐛 Troubleshooting

### If contact queries still route to "admin" agent:

**Check process count**:
```bash
netstat -ano | findstr :8000
```

If more than 1 process:
1. Close all terminals running orchestrator
2. Open Task Manager (Ctrl+Shift+Esc)
3. Find all `python.exe` processes
4. Right-click → "End Process Tree"
5. Restart orchestrator

### If orchestrator won't start:

**Check port availability**:
```bash
netstat -ano | findstr :8000
```

If port is occupied, kill the process:
```bash
# Find PID from netstat output, then:
taskkill /PID <PID> /F
```

### If MCP server issues:

**Check MCP server**:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/tools | jq '.count'  # Should return 46
```

If not running, restart:
```bash
cd C:\Users\gals\Desktop\wesign-mcp-server
node dist/server.js
```

---

## 📊 Expected Log Output

### MCP Server:
```
WeSign MCP Server listening on port 3000
Health check: http://localhost:3000/health
Tools list: http://localhost:3000/tools
Execute endpoint: http://localhost:3000/execute
```

### Orchestrator:
```
🚀 MAIN.PY STARTING - IMPORTS orchestrator_new.py
====================================================================================================
🚀 ORCHESTRATOR_NEW.PY LOADED - WITH REFLECTION PATTERN
📍 File: orchestrator_new.py (NOT orchestrator.py)
✨ Features: Hebrew/English support + Response formatting reflection
====================================================================================================
🤖 Initializing AutoGen agents with WeSign MCP HTTP client...
📡 Connecting to WeSign MCP at: http://localhost:3000
✅ WeSign MCP server is healthy
✅ Fetched 46 tools from WeSign MCP server
✅ Successfully converted 46 / 46 tools
✅ WeSign MCP integration ready with 46 tools
✅ Initialized 5 agents with 46 WeSign tools
✅ Orchestrator ready with native MCP support!
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ Orchestrator log shows "46 tools" and "5 agents"
2. ✅ English query "Show me all my contacts" → `"agent": "contact"`
3. ✅ Hebrew query "הצג לי את אנשי הקשר" → `"agent": "contact"`
4. ✅ Responses are in appropriate language
5. ✅ No errors in logs

---

## 📞 Need Help?

1. **Check logs**: `C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator\orchestrator.log`
2. **Review complete docs**: `C:\Users\gals\WESIGN_CONTACT_IMPLEMENTATION_COMPLETE.md`
3. **Verify code**: All contact keywords in `orchestrator_new.py:478-486`

---

*All code complete and verified - ready to test after restart! 🚀*
