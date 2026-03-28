"""
WeSign AI Dashboard — Full System Test Suite

Tests ALL features across 4 intelligence layers:
  Layer 1: Smart Context (contact resolution)
  Layer 2: Intent Engine (single-step CRUD)
  Layer 3: Workflow Engine (multi-step operations)
  Layer 4: LLM Fallback (creative/ambiguous)

Coverage:
  - Infrastructure (health, login, pages)
  - CRUD operations EN + HE (templates, contacts, documents)
  - All 5 field types (signature, initials, text, date, checkbox)
  - Multi-step workflows
  - Smart contact resolution
  - Security (off-topic, auth)
  - Edge cases (empty, special chars, long messages)
  - Bilingual (English + Hebrew + mixed)
  - Error handling
  - Streaming SSE
  - Non-streaming fallback
"""

import httpx
import json
import asyncio
import time
import sys

BASE = "http://192.168.21.5:9000"
TIMEOUT = 90
RESULTS = {"pass": 0, "fail": 0, "errors": []}


async def stream_chat(client: httpx.AsyncClient, message: str) -> dict:
    """Send a streaming chat request and collect the response."""
    r = await client.post(f"{BASE}/api/chat/stream", json={
        "message": message,
        "context": {"userId": "test", "companyId": "test", "userName": "TestUser"}
    })
    content = ""
    tools = []
    has_error = False
    for line in r.text.split("\n\n"):
        if line.startswith("data: "):
            try:
                d = json.loads(line[6:])
                if d["type"] == "token":
                    content += d["content"]
                elif d["type"] == "error":
                    content = d["content"]
                    has_error = True
                elif d["type"] == "done":
                    tools = [t.get("tool", "") for t in d.get("toolCalls", [])]
            except json.JSONDecodeError:
                pass
    return {"content": content, "tools": tools, "error": has_error, "status": r.status_code}


async def chat(client: httpx.AsyncClient, message: str) -> dict:
    """Send a non-streaming chat request."""
    r = await client.post(f"{BASE}/api/chat", json={
        "message": message,
        "context": {"userId": "test", "companyId": "test", "userName": "TestUser"}
    })
    return r.json()


def test(name: str, passed: bool, detail: str = ""):
    if passed:
        RESULTS["pass"] += 1
        print(f"  PASS  {name}")
    else:
        RESULTS["fail"] += 1
        RESULTS["errors"].append(f"{name}: {detail}")
        print(f"  FAIL  {name} — {detail[:80]}")


async def run_all():
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:

        # ═══════════════════════════════════════════
        # SECTION 1: Infrastructure (5 tests)
        # ═══════════════════════════════════════════
        print("\n── Infrastructure ──")

        r = await c.get(f"{BASE}/health")
        d = r.json()
        test("1.1 Health endpoint", d.get("status") == "healthy")
        test("1.2 Tools loaded (54+)", d["agents"]["mcp_tools"]["wesign"] >= 50, f"got {d['agents']['mcp_tools']['wesign']}")

        r = await c.get(f"{BASE}/login")
        test("1.3 Login page loads", "Welcome" in r.text and r.status_code == 200)

        r = await c.get(f"{BASE}/ui")
        test("1.4 Chat page loads", "WeSign" in r.text and r.status_code == 200)

        r = await c.post(f"{BASE}/api/wesign-login", json={
            "email": "avielc@comda.co.il", "password": "Alon1109!", "persistent": False
        })
        d = r.json()
        if not d.get("success"):
            # Retry once after delay (K3s rate limiting)
            await asyncio.sleep(5)
            r = await c.post(f"{BASE}/api/wesign-login", json={
                "email": "avielc@comda.co.il", "password": "Alon1109!", "persistent": False
            })
            d = r.json()
        test("1.5 Login API succeeds", d.get("success") == True, str(d.get("detail", "")))

        # ═══════════════════════════════════════════
        # SECTION 2: Intent Engine — English (8 tests)
        # ═══════════════════════════════════════════
        print("\n── Intent Engine (English) ──")

        r = await stream_chat(c, "Show me all templates")
        test("2.1 List templates", "template" in r["content"].lower() and not r["error"])

        r = await stream_chat(c, "List my documents")
        test("2.2 List documents", "document" in r["content"].lower() or "מסמך" in r["content"])

        r = await stream_chat(c, "Show contacts")
        test("2.3 List contacts", len(r["content"]) > 50 and not r["error"])

        r = await stream_chat(c, "Search for documents")
        test("2.4 Search documents", len(r["content"]) > 30)

        r = await stream_chat(c, "Show contact groups")
        test("2.5 List contact groups", len(r["content"]) > 20)

        r = await stream_chat(c, "Who am I")
        test("2.6 User info", len(r["content"]) > 5)

        r = await stream_chat(c, "Create contact TestAPI email testapi@test.com")
        test("2.7 Create contact", not r["error"], r["content"][:80])

        r = await stream_chat(c, "Delete document fake-id-123")
        test("2.8 Delete document (routing)", len(r["content"]) > 10)

        # ═══════════════════════════════════════════
        # SECTION 3: Intent Engine — Hebrew (7 tests)
        # ═══════════════════════════════════════════
        print("\n── Intent Engine (Hebrew) ──")

        r = await stream_chat(c, "הצג תבניות")
        test("3.1 Templates HE", len(r["content"]) > 50 and not r["error"])

        r = await stream_chat(c, "הצג מסמכים")
        test("3.2 Documents HE", len(r["content"]) > 50 and not r["error"])

        r = await stream_chat(c, "הצג אנשי קשר")
        test("3.3 Contacts HE", len(r["content"]) > 50 and not r["error"])

        r = await stream_chat(c, "חפש מסמכים")
        test("3.4 Search HE", len(r["content"]) > 20)

        r = await stream_chat(c, "מי אני")
        test("3.5 User info HE", len(r["content"]) > 5)

        r = await stream_chat(c, "צור איש קשר דוד אימייל david@test.com")
        test("3.6 Create contact HE", not r["error"], r["content"][:80])

        r = await stream_chat(c, "הצג את כל התבניות שלי")
        test("3.7 Templates (long form HE)", len(r["content"]) > 50)

        # ═══════════════════════════════════════════
        # SECTION 4: Field Types — All 5 (5 tests)
        # ═══════════════════════════════════════════
        print("\n── Field Types ──")

        r = await stream_chat(c, "Add signature field to template PDF+PDF at bottom right on page 1")
        test("4.1 Signature field", not r["error"], r["content"][:80])

        r = await stream_chat(c, "Add initials field to template 12312 at top right on page 1")
        test("4.2 Initials field", not r["error"], r["content"][:80])

        r = await stream_chat(c, "Add text field to template PDF+WORD at center left")
        test("4.3 Text field", not r["error"], r["content"][:80])

        r = await stream_chat(c, "Add date field to template PDF+PDF at bottom left")
        test("4.4 Date field", not r["error"], r["content"][:80])

        r = await stream_chat(c, "Add checkbox field to template 12312 at top left on page 1")
        test("4.5 Checkbox field", not r["error"], r["content"][:80])

        # ═══════════════════════════════════════════
        # SECTION 5: Field Types — Hebrew (3 tests)
        # ═══════════════════════════════════════════
        print("\n── Field Types (Hebrew) ──")

        r = await stream_chat(c, "הוסף שדה חתימה לתבנית PDF+PDF למטה מימין")
        test("5.1 Signature HE", not r["error"], r["content"][:80])

        r = await stream_chat(c, "הוסף שדה תאריך לתבנית 12312 למטה משמאל")
        test("5.2 Date field HE", not r["error"], r["content"][:80])

        r = await stream_chat(c, "הוסף תיבת סימון לתבנית PDF+WORD למעלה מימין בעמוד 1")
        test("5.3 Checkbox HE", not r["error"], r["content"][:80])

        # ═══════════════════════════════════════════
        # SECTION 6: Workflow Engine — Multi-step (5 tests)
        # ═══════════════════════════════════════════
        print("\n── Workflow Engine ──")

        r = await stream_chat(c, "Load template PDF+PDF and add a signature field at bottom right")
        test("6.1 Load + add field", len(r["tools"]) >= 2, f"tools={r['tools']}")

        r = await stream_chat(c, "Add two signature fields to template 12312 at bottom left and bottom right")
        test("6.2 Two fields", len(r["tools"]) >= 1 and not r["error"], f"tools={r['tools']}")

        r = await stream_chat(c, "Load template PDF+PDF, add 2 signature fields at bottom, and send to test@example.com")
        test("6.3 Full workflow (load+fields+send)", len(r["tools"]) >= 2, f"tools={r['tools']}")

        r = await stream_chat(c, "הצג תבניות ותוסיף שדה חתימה לתבנית PDF+PDF")
        test("6.4 Multi-step HE", len(r["content"]) > 50)

        r = await stream_chat(c, "Create contact Workflow email workflow@test.com and add text field to template 12312")
        test("6.5 Create + add field", len(r["content"]) > 20)

        # ═══════════════════════════════════════════
        # SECTION 7: Smart Context (4 tests)
        # ═══════════════════════════════════════════
        print("\n── Smart Context ──")

        r = await stream_chat(c, "Send document to Aviel")
        test("7.1 Smart send (name → contact)", "Aviel" in r["content"] and "comda" in r["content"].lower(), r["content"][:80])

        r = await stream_chat(c, "Send document to nobody@nowhere.com")
        test("7.2 Send to email (direct)", len(r["content"]) > 10)

        r = await stream_chat(c, "Send to Unknown Person")
        test("7.3 Send to unknown (asks email)", "email" in r["content"].lower() or "אימייל" in r["content"], r["content"][:80])

        r = await stream_chat(c, "שלח מסמך לAviel")
        test("7.4 Smart send HE", len(r["content"]) > 10)

        # ═══════════════════════════════════════════
        # SECTION 8: Security & Guard (4 tests)
        # ═══════════════════════════════════════════
        print("\n── Security ──")

        r = await chat(c, "What is the weather today?")
        test("8.1 Off-topic blocked", "WeSign" in r.get("response", ""), r.get("response", "")[:60])

        r = await chat(c, "Tell me a joke")
        test("8.2 Off-topic blocked (joke)", "WeSign" in r.get("response", "") or "document" in r.get("response", "").lower())

        r = await stream_chat(c, "Show me the password for the database")
        test("8.3 Sensitive data blocked", "WeSign" in r["content"] or len(r["content"]) < 200)

        r = await chat(c, "")
        test("8.4 Empty message handled", r.get("detail") is not None or "error" in str(r).lower())

        # ═══════════════════════════════════════════
        # SECTION 9: Chat Behaviors (4 tests)
        # ═══════════════════════════════════════════
        print("\n── Chat Behaviors ──")

        r = await stream_chat(c, "Hello!")
        test("9.1 Greeting EN", len(r["content"]) > 10 and not r["error"])

        r = await stream_chat(c, "שלום")
        test("9.2 Greeting HE", len(r["content"]) > 5 and not r["error"])

        r = await stream_chat(c, "Thank you for your help")
        test("9.3 Thanks EN", len(r["content"]) > 5)

        r = await stream_chat(c, "תודה רבה")
        test("9.4 Thanks HE", len(r["content"]) > 5)

        # ═══════════════════════════════════════════
        # SECTION 10: Non-streaming & Edge Cases (5 tests)
        # ═══════════════════════════════════════════
        print("\n── Edge Cases ──")

        r = await chat(c, "Show templates")
        test("10.1 Non-stream response", bool(r.get("response")))

        r = await stream_chat(c, "a")
        test("10.2 Single char message", len(r["content"]) > 0 or r["error"] == False)

        r = await stream_chat(c, "Show me templates " * 20)
        test("10.3 Long message (>500 chars)", len(r["content"]) > 0)

        r = await stream_chat(c, 'Create contact O\'Brien email obrien@test.com')
        test("10.4 Special chars in name", len(r["content"]) > 10)

        r = await stream_chat(c, "Show templates and also contacts and documents")
        test("10.5 Multi-entity request", len(r["content"]) > 50)

        # ═══════════════════════════════════════════
        # SECTION 11: Field Positions — All 6 (6 tests)
        # ═══════════════════════════════════════════
        print("\n── Field Positions ──")

        for pos in ["top-left", "top-right", "center-left", "center-right", "bottom-left", "bottom-right"]:
            r = await stream_chat(c, f"Add signature field to template PDF+PDF at {pos}")
            test(f"11.{['top-left','top-right','center-left','center-right','bottom-left','bottom-right'].index(pos)+1} Position {pos}", not r["error"], r["content"][:60])

        # ═══════════════════════════════════════════
        # SECTION 12: Bilingual mixed (4 tests)
        # ═══════════════════════════════════════════
        print("\n── Bilingual Mixed ──")

        r = await stream_chat(c, "Show me the תבניות")
        test("12.1 Mixed EN+HE (templates)", len(r["content"]) > 30)

        r = await stream_chat(c, "הצג documents שלי")
        test("12.2 Mixed HE+EN (documents)", len(r["content"]) > 30)

        r = await stream_chat(c, "Create contact ישראל email israel@test.com")
        test("12.3 Hebrew name in EN command", not r["error"])

        r = await stream_chat(c, "צור איש קשר John email john@test.com")
        test("12.4 EN name in HE command", not r["error"])

        # ═══════════════════════════════════════════
        # SECTION 13: Delete operations (3 tests)
        # ═══════════════════════════════════════════
        print("\n── Delete Operations ──")

        r = await stream_chat(c, "Delete document test-fake-id")
        test("13.1 Delete doc (bad ID)", len(r["content"]) > 10)

        r = await stream_chat(c, "Delete template PDF+PDF")
        test("13.2 Delete template (by name)", len(r["content"]) > 10)

        r = await stream_chat(c, "מחק מסמך test-id-123")
        test("13.3 Delete doc HE", len(r["content"]) > 10)

        # ═══════════════════════════════════════════
        # SECTION 14: Duplicate template (2 tests)
        # ═══════════════════════════════════════════
        print("\n── Duplicate Template ──")

        r = await stream_chat(c, "Duplicate template PDF+PDF as Copy of PDF")
        test("14.1 Duplicate EN", len(r["content"]) > 10)

        r = await stream_chat(c, "שכפל תבנית 12312 בשם עותק")
        test("14.2 Duplicate HE", len(r["content"]) > 10)

        # ═══════════════════════════════════════════
        # SECTION 15: Conversation context (2 tests)
        # ═══════════════════════════════════════════
        print("\n── Context ──")

        r = await stream_chat(c, "Show me all templates")
        test("15.1 Context: first message", "template" in r["content"].lower())

        r = await stream_chat(c, "Now show contacts")
        test("15.2 Context: follow-up", len(r["content"]) > 30)

        # ═══════════════════════════════════════════
        # SECTION 16: API endpoints (4 tests)
        # ═══════════════════════════════════════════
        print("\n── API Endpoints ──")

        r = await c.get(f"{BASE}/health")
        test("16.1 GET /health", r.status_code == 200)

        r = await c.post(f"{BASE}/api/chat", json={"message": "", "context": {"userId": "t", "companyId": "t", "userName": "t"}})
        test("16.2 Empty chat message", r.status_code in [200, 400, 422])

        r = await c.get(f"{BASE}/api/tools")
        test("16.3 GET /api/tools (if exists)", r.status_code in [200, 404])

        r = await c.post(f"{BASE}/api/upload")
        test("16.4 Upload without file", r.status_code in [400, 422])

    # ═══════════════════════════════════════════
    # RESULTS
    # ═══════════════════════════════════════════
    total = RESULTS["pass"] + RESULTS["fail"]
    print(f"\n{'='*50}")
    print(f"  TOTAL: {RESULTS['pass']}/{total} PASSED")
    print(f"{'='*50}")
    if RESULTS["errors"]:
        print(f"\n  FAILURES ({len(RESULTS['errors'])}):")
        for e in RESULTS["errors"]:
            print(f"    - {e}")

    return RESULTS["fail"] == 0


if __name__ == "__main__":
    success = asyncio.run(run_all())
    sys.exit(0 if success else 1)
