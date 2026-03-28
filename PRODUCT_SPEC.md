# WeSign AI Dashboard - Product Specification

## Source of Truth for System Architecture, Flows, and Endpoints

### 1. System Overview

The WeSign AI Dashboard is an AI-powered assistant for WeSign document signing operations.
Users interact via a chat interface, and an LLM-powered multi-agent system executes WeSign operations on their behalf.

**Architecture:** 3 services running locally on the developer's Windows machine, with LLM inference on a remote GPU server.

```
User Browser
    |
    v
[Frontend HTML]  (localhost:8000 - served by FastAPI)
    |
    v
[FastAPI Orchestrator]  (localhost:8000)
    |              |
    v              v
[Ollama LLM]   [MCP Server]  (localhost:3000)
(192.168.21.5:8000)   |
                      v
              [WeSign K3s API]  (192.168.21.5:30080)
```

### 2. Service Inventory

| Service | Port | Technology | Location |
|---------|------|-----------|----------|
| Frontend | 8000 (via FastAPI) | Vanilla HTML/CSS/JS | `frontend/login.html`, `frontend/chatkit.html` |
| Orchestrator | 8000 | Python FastAPI + AutoGen 0.7.5 | `orchestrator/main.py` |
| MCP Server | 3000 | Node.js Express + TypeScript | `~/repos/wesignv3-wesign-mcp-server/` |
| Ollama LLM | 8000 (remote) | Ollama 0.18.2 on Ubuntu 24.04 | `alex@192.168.21.5` |
| WeSign API | 30080 (remote) | .NET K3s deployment | `192.168.21.5:30080` (K3s ingress) |

### 3. WeSign API Endpoints (K3s)

**Base URL:** `http://192.168.21.5:30080/userapi/v3`

| Endpoint | Method | Purpose | Verified |
|----------|--------|---------|----------|
| `/Users/Login` | POST | Authenticate user, returns JWT | YES - 200 OK |
| `/Users/Logout` | GET | Invalidate session | - |
| `/users` | GET | Get current user info (19 fields) | YES - 200 OK |
| `/users` | PUT | Update user info | - |
| `/Templates` | GET | List templates (returns {templates:[]}) | YES - 200 OK |
| `/templates/{id}` | GET | Get template details | - |
| `/templates` | POST | Create template | - |
| `/documentcollections` | GET | List documents (returns {documentCollections:[]}) | YES - 200 OK |
| `/documentcollections` | POST | Create document collection | - |
| `/selfsign` | POST | Create self-sign document | - |
| `/selfsign` | PUT | Update self-sign document | - |
| `/contacts` | GET | List contacts (returns {contacts:[]}) | YES - 200 OK |
| `/contacts` | POST | Create contact | - |
| `/contacts/{id}` | GET | Get contact details | - |
| `/contacts/group` | GET | List contact groups | - |
| `/contacts/group` | POST | Create contact group | - |
| `/distribution/signers` | POST | Send document for signing | - |

### 4. Frontend Pages

#### Login Page (`/login` -> `frontend/login.html`)
- **Layout:** 40/60 split (form left, branding right)
- **Design:** Poppins font, #3A8EEF primary, white background
- **Flow:** POST `/api/wesign-login` -> MCP Server -> WeSign API -> JWT
- **Storage:** `sessionStorage`/`localStorage` for `wesign_auth_token`, `wesign_user_name`, `wesign_user_email`
- **On success:** Redirect to `/ui`

#### Chat Page (`/ui` -> `frontend/chatkit.html`)
- **Layout:** Navy #061238 header with profile pill, #F6F8FB body, white cards
- **Auth check:** Reads `wesign_auth_token` from storage, redirects to `/login` if missing
- **Input:** Text + voice (Whisper) + file upload (drag-and-drop)
- **Output:** Formatted responses from AutoGen agents via `/api/chat`
- **Test automation:** `data-status="complete"` attribute on assistant messages

### 5. Orchestrator Agents

| Agent | Model | Purpose | Tool Access |
|-------|-------|---------|-------------|
| DocumentAgent | qwen2.5:14b (tool model) | Document CRUD | All 31 WeSign tools |
| SigningAgent | qwen2.5:14b | Self-sign workflows, field placement | All 31 WeSign tools |
| TemplateAgent | qwen2.5:14b | Template management | All 31 WeSign tools |
| ContactAgent | qwen2.5:14b | Contact/group management | 12 contact-specific tools |
| AdminAgent | qwen2.5:14b | User info, settings | All 31 WeSign tools |
| FormatterAgent | qwen2.5:32b (formatter model) | Format raw tool results | No tools (NLG only) |

**Agent selection:** Keyword-based in `_select_agent()` method (English + Hebrew keywords).
**Flow:** User message -> select agent -> agent calls tools -> extract tool results -> FormatterAgent formats response -> return to user.

### 6. LLM Configuration

| Parameter | Value |
|-----------|-------|
| Server | `192.168.21.5:8000` (Ollama, OpenAI-compatible) |
| Tool Model | `qwen2.5:14b` (fast, reliable tool calling) |
| Formatter Model | `qwen2.5:32b` (high quality NLG, bilingual) |
| Hardware | 2x Tesla T4 (30GB VRAM), 64 CPU cores, 251GB RAM |
| API Key | `ollama` (any string, Ollama doesn't validate) |

### 7. MCP Server Tools (35 total, 31 with schemas)

**Authentication (3):** wesign_login, wesign_logout, wesign_refresh_token
**Documents (5):** wesign_upload_document, wesign_create_document_collection, wesign_list_documents, wesign_get_document_info, wesign_download_document
**Self-Signing (6):** wesign_create_self_sign, wesign_add_signature_fields, wesign_complete_signing, wesign_save_draft, wesign_decline_document, wesign_get_signing_status
**Templates (4):** wesign_create_template, wesign_list_templates, wesign_get_template, wesign_use_template
**Multi-Party (5+):** wesign_send_for_signature, wesign_send_simple_document, wesign_resend_document, wesign_replace_signer, wesign_cancel_document, wesign_reactivate_document, wesign_share_document, wesign_get_signer_link
**Contacts (8+):** wesign_create_contact, wesign_list_contacts, wesign_get_contact, wesign_update_contact, wesign_delete_contact, wesign_create_contact_group, wesign_list_contact_groups, wesign_get_contact_group
**Admin (3):** wesign_get_user_info, wesign_update_user_info, wesign_check_auth_status

### 8. Authentication Flow

```
1. User enters email/password in login.html
2. Frontend POSTs to /api/wesign-login
3. Orchestrator calls MCP Server POST /execute {tool: "wesign_login", parameters: {...}}
4. MCP Server calls WeSign API POST /userapi/v3/Users/Login
5. WeSign returns JWT token + refreshToken
6. MCP Server stores tokens internally
7. Orchestrator generates session token, stores in session_tokens dict
8. Frontend stores auth token in sessionStorage
9. Frontend redirects to /ui (chatkit.html)
```

### 9. Chat Flow

```
1. User types message in chatkit.html
2. Frontend POSTs to /api/chat {message, context: {userId, companyId, userName, conversationId}, files}
3. Orchestrator._select_agent() picks agent by keywords
4. Agent.run(task=message) -> LLM decides which tool to call
5. ForcedToolModelClient forces tool_choice='required'
6. Tool wrapper calls MCP Server POST /execute {tool: name, parameters: {...}}
7. MCP Server routes to correct tool handler -> calls WeSign API
8. Result flows back: WeSign API -> MCP -> tool wrapper -> agent
9. If tool was called: FormatterAgent formats raw result into user-friendly text
10. Response returned to frontend: {response, conversationId, toolCalls}
```

### 10. Environment Variables

**Orchestrator (.env):**
- `LLM_BASE_URL` - Ollama endpoint (default: http://192.168.21.5:8000/v1)
- `TOOL_MODEL` - Model for tool agents (default: qwen2.5:14b)
- `FORMATTER_MODEL` - Model for formatter (default: qwen2.5:32b)
- `OPENAI_API_KEY` - API key (default: ollama)
- `WESIGN_MCP_URL` - MCP server URL (default: http://localhost:3000)
- `WESIGN_BACKEND_URL` - Direct WeSign API URL (default: http://192.168.21.5:30080)
- `WESIGN_EMAIL` / `WESIGN_PASSWORD` - WeSign credentials for template fetching
- `HOST` / `PORT` - Server binding (default: 0.0.0.0:8000)
- `ALLOWED_ORIGINS` - CORS whitelist

**MCP Server (env vars):**
- `WESIGN_API_URL` - WeSign API base URL (http://192.168.21.5:30080)
- `WESIGN_EMAIL` / `WESIGN_PASSWORD` - Auto-login credentials
- `PORT` - Server port (3000)

### 11. Test Suites

| Suite | Location | Framework | Tests |
|-------|----------|-----------|-------|
| E2E Basic | `tests/e2e/wesign-assistant.spec.js` | Playwright | 10 UI tests |
| Tool Validation | `tests/e2e/tool-validation.spec.js` | Playwright | 30+ tool tests (EN + HE) |
| Page Objects | `tests/page-objects/ChatPage.js` | Playwright POM | Reusable selectors |

**Key selectors:**
- `#chatInput` - Message input field
- `#sendButton` - Send button
- `#micButton` - Voice recording button
- `.message.user` - User messages
- `.message.assistant[data-status="complete"]` - Completed assistant responses
- `.chat-header` - Navigation header
- `.welcome-card` - Welcome card
- `.file-upload-zone` - File upload area

### 12. WeSign Users (K3s)

| Email | Password | Role |
|-------|----------|------|
| admin@wesign.local | Admin123! | CompanyAdmin |
| avielc@comda.co.il | Alon1109! | SystemAdmin |

### 13. Startup Sequence

1. Start Ollama (already running on alex-ai as system service)
2. Start MCP Server: `WESIGN_API_URL=http://192.168.21.5:30080 PORT=3000 node dist/server.js`
3. Start Orchestrator: `cd orchestrator && python main.py`
4. Open browser: `http://localhost:8000/login`
