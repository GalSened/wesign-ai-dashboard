# WeSign AI Dashboard - Complete System Testing Guide

**Status**: All 5 agents with 46 tools ready for comprehensive testing
**Date**: 2025-11-16
**Scope**: Full system verification - ALL modules, ALL agents, ALL tools

---

## System Overview

### 5 Specialized Agents:
1. **Document Agent** - Document management (upload, list, download, search)
2. **Signing Agent** - Signature workflows (send for signature, track status)
3. **Template Agent** - Template operations (create, list, use templates)
4. **Contact Agent** - Contact management (create, list, update, delete contacts/groups) ⭐ NEW
5. **Admin Agent** - General help and system information

### 46 WeSign MCP Tools:
- **Document tools**: 8 tools (upload, list, download, search, merge, etc.)
- **Signing tools**: 8 tools (send, status, resend, replace signer, etc.)
- **Template tools**: 6 tools (create, list, get, use, update fields)
- **Contact tools**: 12 tools (create, list, update, delete contacts/groups) ⭐ NEW
- **Admin tools**: 12 tools (user info, auth, check status)

### Bilingual Support:
- ✅ English keyword routing
- ✅ Hebrew keyword routing (עברית)
- ✅ Language-appropriate response formatting

---

## Pre-Testing Requirements

### 1. Start MCP Server
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

**Verify**:
```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy"}

curl http://localhost:3000/tools | jq '.count'
# Expected: 46
```

### 2. Start Orchestrator
```bash
cd C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator
venv\Scripts\python.exe main.py
```

**Expected Output**:
```
🚀 MAIN.PY STARTING - IMPORTS orchestrator_new.py
====================================================================================================
🚀 ORCHESTRATOR_NEW.PY LOADED - WITH REFLECTION PATTERN
====================================================================================================
🤖 Initializing AutoGen agents with WeSign MCP HTTP client...
✅ WeSign MCP server is healthy
✅ Fetched 46 tools from WeSign MCP server
✅ Successfully converted 46 / 46 tools
✅ Initialized 5 agents with 46 WeSign tools
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 3. Verify Single Process
```bash
netstat -ano | findstr :8000
```

**Expected**: ONLY 1 line showing Python process on port 8000
**Critical**: If you see multiple processes, restart machine before testing!

---

## Complete Test Suite

### Test 1: Document Agent (English)

**Test File**: `C:\tmp\test_document_english.json`
**Message**: "Show me all my documents"
**Expected Agent**: `document`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_document_english.json
```

**Success Criteria**:
```json
{
  "response": "[Document listing or appropriate response]",
  "metadata": {
    "agent": "document",  // ✅ MUST be "document"
    "conversationId": "test-document-english-001"
  }
}
```

### Test 2: Document Agent (Hebrew)

**Test File**: `C:\tmp\test_document_hebrew.json`
**Message**: "הצג לי את המסמכים שלי"
**Expected Agent**: `document`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_document_hebrew.json
```

**Success Criteria**:
```json
{
  "response": "[Hebrew response with document information]",
  "metadata": {
    "agent": "document"  // ✅ MUST be "document"
  }
}
```

### Test 3: Signing Agent (English)

**Test File**: `C:\tmp\test_signing_english.json`
**Message**: "Send a document for signature"
**Expected Agent**: `signing`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_signing_english.json
```

**Success Criteria**:
```json
{
  "response": "[Response about sending for signature]",
  "metadata": {
    "agent": "signing"  // ✅ MUST be "signing"
  }
}
```

### Test 4: Signing Agent (Hebrew)

**Test File**: `C:\tmp\test_signing_hebrew.json`
**Message**: "שלח מסמך לחתימה"
**Expected Agent**: `signing`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_signing_hebrew.json
```

**Success Criteria**:
```json
{
  "response": "[Hebrew response about signature workflow]",
  "metadata": {
    "agent": "signing"  // ✅ MUST be "signing"
  }
}
```

### Test 5: Template Agent (English)

**Test File**: `C:\tmp\test_template_english.json`
**Message**: "List all my templates"
**Expected Agent**: `template`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_template_english.json
```

**Success Criteria**:
```json
{
  "response": "[Template listing or appropriate response]",
  "metadata": {
    "agent": "template"  // ✅ MUST be "template"
  }
}
```

### Test 6: Template Agent (Hebrew)

**Test File**: `C:\tmp\test_template_hebrew.json`
**Message**: "הצג לי את התבניות שלי"
**Expected Agent**: `template`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_template_hebrew.json
```

**Success Criteria**:
```json
{
  "response": "[Hebrew response with template information]",
  "metadata": {
    "agent": "template"  // ✅ MUST be "template"
  }
}
```

### Test 7: Contact Agent (English) ⭐ NEW

**Test File**: `C:\tmp\test_contact_english.json`
**Message**: "Show me all my contacts"
**Expected Agent**: `contact`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_contact_english.json
```

**Success Criteria**:
```json
{
  "response": "[Contact listing or appropriate response]",
  "metadata": {
    "agent": "contact"  // ✅ MUST be "contact", NOT "admin"
  }
}
```

### Test 8: Contact Agent (Hebrew) ⭐ NEW

**Test File**: `C:\tmp\test_contact_hebrew.json`
**Message**: "הצג לי את אנשי הקשר שלי"
**Expected Agent**: `contact`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_contact_hebrew.json
```

**Success Criteria**:
```json
{
  "response": "[Hebrew response with contact information]",
  "metadata": {
    "agent": "contact"  // ✅ MUST be "contact"
  }
}
```

### Test 9: Admin Agent (English)

**Test File**: `C:\tmp\test_admin_english.json`
**Message**: "What can you help me with?"
**Expected Agent**: `admin`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_admin_english.json
```

**Success Criteria**:
```json
{
  "response": "[General help response listing capabilities]",
  "metadata": {
    "agent": "admin"  // ✅ MUST be "admin"
  }
}
```

### Test 10: Admin Agent (Hebrew)

**Test File**: `C:\tmp\test_admin_hebrew.json`
**Message**: "במה אתה יכול לעזור לי?"
**Expected Agent**: `admin`

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d @C:\tmp\test_admin_hebrew.json
```

**Success Criteria**:
```json
{
  "response": "[Hebrew general help response]",
  "metadata": {
    "agent": "admin"  // ✅ MUST be "admin"
  }
}
```

---

## Automated Test Script

**Create and run**: `C:\tmp\run_all_tests.bat`

```batch
@echo off
echo ============================================================================
echo WeSign AI Dashboard - Complete System Test Suite
echo ============================================================================
echo.

set BASE_URL=http://localhost:8000/api/chat
set RESULTS_FILE=C:\tmp\test_results.txt

echo Test Results > %RESULTS_FILE%
echo ============================================================================ >> %RESULTS_FILE%
echo.

echo Test 1: Document Agent (English)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_document_english.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo Test 2: Document Agent (Hebrew)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_document_hebrew.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo Test 3: Signing Agent (English)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_signing_english.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo Test 4: Signing Agent (Hebrew)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_signing_hebrew.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo Test 5: Template Agent (English)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_template_english.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo Test 6: Template Agent (Hebrew)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_template_hebrew.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo Test 7: Contact Agent (English)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_contact_english.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo Test 8: Contact Agent (Hebrew)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_contact_hebrew.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo Test 9: Admin Agent (English)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_admin_english.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo Test 10: Admin Agent (Hebrew)
curl -s -X POST %BASE_URL% -H "Content-Type: application/json" -d @C:\tmp\test_admin_hebrew.json | jq ".metadata.agent" >> %RESULTS_FILE%

echo.
echo ============================================================================
echo All tests complete! Results saved to: %RESULTS_FILE%
echo ============================================================================
type %RESULTS_FILE%
```

**Expected Results File**:
```
Test Results
============================================================================

"document"
"document"
"signing"
"signing"
"template"
"template"
"contact"
"contact"
"admin"
"admin"
```

---

## Agent Routing Keywords Reference

### Document Agent Keywords:
- **English**: document, documents, file, files, upload, download
- **Hebrew**: מסמך, מסמכים, קובץ, קבצים

### Signing Agent Keywords:
- **English**: sign, signature, signing, signer, send for signature
- **Hebrew**: חתימה, חתום, לחתום, חותם

### Template Agent Keywords:
- **English**: template, templates
- **Hebrew**: תבנית, תבניות

### Contact Agent Keywords:
- **English**: contact, contacts, address book, create contact
- **Hebrew**: איש קשר, אנשי קשר, ספר כתובות, קבוצה, קבוצת

### Admin Agent (Fallback):
- Handles all queries that don't match other agents
- General help, system questions, unclear requests

---

## Success Checklist

After running all tests:

- [ ] MCP server running on port 3000
- [ ] Orchestrator running on port 8000
- [ ] ONLY 1 Python process on port 8000
- [ ] Log shows: "Initialized 5 agents with 46 WeSign tools"
- [ ] All 46 tools available: `curl http://localhost:3000/tools | jq '.count'`
- [ ] Test 1: Document (English) → agent: "document" ✅
- [ ] Test 2: Document (Hebrew) → agent: "document" ✅
- [ ] Test 3: Signing (English) → agent: "signing" ✅
- [ ] Test 4: Signing (Hebrew) → agent: "signing" ✅
- [ ] Test 5: Template (English) → agent: "template" ✅
- [ ] Test 6: Template (Hebrew) → agent: "template" ✅
- [ ] Test 7: Contact (English) → agent: "contact" ✅
- [ ] Test 8: Contact (Hebrew) → agent: "contact" ✅
- [ ] Test 9: Admin (English) → agent: "admin" ✅
- [ ] Test 10: Admin (Hebrew) → agent: "admin" ✅
- [ ] All responses in appropriate language (Hebrew/English)
- [ ] No errors in orchestrator logs
- [ ] No errors in MCP server logs

---

## Troubleshooting

### Issue: Wrong agent selected

**Problem**: Query routes to wrong agent (e.g., contact → admin)

**Diagnosis**:
```bash
# Check how many processes on port 8000
netstat -ano | findstr :8000

# Should show ONLY 1 process
# If multiple processes: stale orchestrator instances
```

**Fix**: Restart machine or run cleanup script:
```powershell
C:\Users\gals\WESIGN_CLEANUP_FIXED.ps1
```

### Issue: MCP server not responding

**Problem**: Tools not available, 46 tools not loading

**Diagnosis**:
```bash
curl http://localhost:3000/health
# Should return: {"status":"healthy"}

curl http://localhost:3000/tools
# Should list 46 tools
```

**Fix**: Restart MCP server:
```bash
cd C:\Users\gals\Desktop\wesign-mcp-server
node dist/server.js
```

### Issue: Orchestrator fails to start

**Problem**: Port 8000 already in use

**Diagnosis**:
```bash
netstat -ano | findstr :8000
```

**Fix**: Kill processes and restart:
```bash
taskkill /PID <PID> /F
cd C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator
venv\Scripts\python.exe main.py
```

---

## Test Files Location

All test files are in: `C:\tmp\`

- `test_document_english.json` - Document agent (English)
- `test_document_hebrew.json` - Document agent (Hebrew)
- `test_signing_english.json` - Signing agent (English)
- `test_signing_hebrew.json` - Signing agent (Hebrew)
- `test_template_english.json` - Template agent (English)
- `test_template_hebrew.json` - Template agent (Hebrew)
- `test_contact_english.json` - Contact agent (English) ⭐
- `test_contact_hebrew.json` - Contact agent (Hebrew) ⭐
- `test_admin_english.json` - Admin agent (English)
- `test_admin_hebrew.json` - Admin agent (Hebrew)

---

## Production Deployment

Once all tests pass:

1. **Verify Production Requirements**:
   - All 10 tests passing (5 agents × 2 languages)
   - No errors in logs
   - Single orchestrator process
   - All 46 tools loaded

2. **Update Environment**:
   - Set production API keys in `.env`
   - Configure production MCP server URL
   - Set appropriate logging levels

3. **Deploy**:
   - Pull latest code from GitHub
   - Install dependencies: `pip install -r requirements.txt`
   - Start services with production configs
   - Run full test suite
   - Monitor logs for 24 hours

---

*Complete system testing guide for all 5 agents and 46 tools* 🚀
*Generated: 2025-11-16*
