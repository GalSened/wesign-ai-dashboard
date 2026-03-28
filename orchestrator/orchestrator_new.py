"""
WeSign AI Orchestrator v5 — Streaming + Python Formatting

Architecture:
  User message → LLM tool selection (streaming) → MCP execute → Python format → SSE stream to client

No second LLM call. Formatting is deterministic Python code.
Target: first content in <3 seconds.
"""

import os
import json
import re
import logging
import asyncio
from typing import Dict, Any, Optional, List, AsyncGenerator
from datetime import datetime

import httpx
from dotenv import load_dotenv

load_dotenv(override=True)
logger = logging.getLogger(__name__)

ORCHESTRATOR_VERSION = "v5.0-streaming-2026-03-28"


class WeSignOrchestrator:

    def __init__(self):
        self.conversations: Dict[str, list] = {}
        self.template_cache: Dict[str, str] = {}  # name → GUID
        self.llm_base_url = os.getenv("LLM_BASE_URL", "http://172.17.0.1:8000/v1")
        self.llm_model = os.getenv("TOOL_MODEL", "glm-4.7-flash:latest")
        self.llm_api_key = os.getenv("OPENAI_API_KEY", "ollama")
        self.mcp_url = os.getenv("WESIGN_MCP_URL", "http://localhost:3000")
        self.openai_tools: List[Dict] = []
        self._http = httpx.AsyncClient(timeout=120.0)
        logger.info(f"Orchestrator {ORCHESTRATOR_VERSION} | LLM={self.llm_model}")
        # Load persisted conversations
        try:
            if os.path.exists("/tmp/wesign-conversations.json"):
                with open("/tmp/wesign-conversations.json") as f:
                    self.conversations = json.load(f)
                logger.info(f"Loaded {len(self.conversations)} conversations from disk")
        except Exception:
            pass

    async def initialize(self):
        try:
            resp = await self._http.get(f"{self.mcp_url}/tools")
            data = resp.json()
            for t in data.get("tools", []):
                schema = t.get("inputSchema", {})
                if not schema.get("properties"):
                    continue
                self.openai_tools.append({
                    "type": "function",
                    "function": {
                        "name": t["name"],
                        "description": t.get("description", ""),
                        "parameters": {
                            "type": "object",
                            "properties": schema.get("properties", {}),
                            "required": schema.get("required", []),
                        }
                    }
                })
            logger.info(f"Loaded {len(self.openai_tools)} tools")

            # Pre-load template IDs for GUID resolution
            try:
                tmpl_result = await self._execute_mcp_tool("wesign_list_templates", {"limit": 100})
                self._cache_templates(tmpl_result)
            except Exception:
                logger.warning("Could not pre-load template IDs")

        except Exception as e:
            logger.error(f"Failed to load tools: {e}")

    SYSTEM_PROMPT = (
        "You are WeSign AI Assistant for digital document signing. "
        "Call the appropriate tool for requests about documents, templates, contacts, or signing. "
        "FIELD TOOLS: Template fields=wesign_add_field_smart, Template presets=wesign_add_signature_preset, "
        "Self-sign fields=wesign_add_signature_fields, Self-sign positions=wesign_add_fields_by_position. "
        "Field types: signature,initial,text,date,checkbox. "
        "Positions: top-left,top-right,center-left,center-right,bottom-left,bottom-right. "
    )

    # ── streaming entry point ────────────────────────────────────────

    async def process_message_stream(
        self, message: str, user_id: str = "", company_id: str = "",
        user_name: str = "", conversation_id: Optional[str] = None,
        files: Optional[List[Dict]] = None,
    ) -> AsyncGenerator[str, None]:
        """Yields SSE data chunks: {"type":"status"|"token"|"done", "content":"..."}"""
        if not conversation_id:
            conversation_id = f"conv-{datetime.now().timestamp()}"

        is_hebrew = any('\u0590' <= c <= '\u05FF' for c in message)

        # #5: Keyword pre-routing — skip LLM for simple list operations
        fast_tool = self._try_keyword_route(message)
        if fast_tool:
            yield self._sse({"type": "status", "content": "מביא נתונים..." if is_hebrew else "Fetching..."})
            result = await self._execute_mcp_tool(fast_tool, {})
            if "list_templates" in fast_tool:
                self._cache_templates(result)
            formatted = self._format_result(fast_tool, result, is_hebrew)
            for chunk in self._chunked(formatted, 8):
                yield self._sse({"type": "token", "content": chunk})
                await asyncio.sleep(0.02)
            self._store(conversation_id, message, formatted)
            yield self._sse({"type": "done", "content": "", "toolCalls": [{"tool": fast_tool}]})
            return

        yield self._sse({"type": "status", "content": "מעבד..." if is_hebrew else "Processing..."})

        history = self.conversations.get(conversation_id, [])
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
        messages.extend(history[-10:])
        messages.append({"role": "user", "content": message})

        try:
            # Step 1: LLM tool selection (non-streaming, faster for short output)
            llm_resp = await self._call_llm(messages, tools=self.openai_tools)
            assistant_msg = llm_resp["choices"][0]["message"]

            # Fallback: parse tool call from text if model didn't use tool_calls field
            if not assistant_msg.get("tool_calls") and assistant_msg.get("content"):
                parsed = self._parse_tool_from_text(assistant_msg["content"])
                if parsed:
                    assistant_msg["tool_calls"] = parsed

            if assistant_msg.get("tool_calls"):
                tc = assistant_msg["tool_calls"][0]
                fn = tc["function"]
                tool_name = fn["name"]
                try:
                    args = json.loads(fn["arguments"]) if isinstance(fn["arguments"], str) else fn["arguments"]
                except json.JSONDecodeError:
                    args = {}

                yield self._sse({"type": "status", "content": f"{'מביא נתונים' if is_hebrew else 'Fetching data'}..."})

                # Step 2: Resolve template names → GUIDs, then MCP execute
                args = self._resolve_template_id(args)
                result = await self._execute_mcp_tool(tool_name, args)
                if "list_templates" in tool_name:
                    self._cache_templates(result)

                # Step 3: Python formatting (instant!)
                formatted = self._format_result(tool_name, result, is_hebrew)

                # Step 4: Stream formatted text token by token
                for chunk in self._chunked(formatted, 8):
                    yield self._sse({"type": "token", "content": chunk})
                    await asyncio.sleep(0.02)  # typewriter effect

                # Store
                self._store(conversation_id, message, formatted)
                yield self._sse({"type": "done", "content": "", "toolCalls": [{"tool": tool_name}]})
            else:
                # No tool called — direct text response
                content = assistant_msg.get("content", "")
                for chunk in self._chunked(content, 8):
                    yield self._sse({"type": "token", "content": chunk})
                    await asyncio.sleep(0.02)
                self._store(conversation_id, message, content)
                yield self._sse({"type": "done", "content": ""})

        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            yield self._sse({"type": "error", "content": str(e)})

    # ── non-streaming (backward compat) ──────────────────────────────

    async def process_message(self, message: str, **kwargs) -> Dict[str, Any]:
        full_response = ""
        tool_calls = []
        conv_id = kwargs.get("conversation_id", f"conv-{datetime.now().timestamp()}")
        async for chunk_str in self.process_message_stream(message, conversation_id=conv_id, **{k:v for k,v in kwargs.items() if k != 'conversation_id'}):
            try:
                data = json.loads(chunk_str.replace("data: ", ""))
                if data["type"] == "token":
                    full_response += data["content"]
                elif data["type"] == "done":
                    tool_calls = data.get("toolCalls", [])
            except:
                pass
        return {
            "response": full_response,
            "conversationId": conv_id,
            "toolCalls": tool_calls,
            "metadata": {"version": ORCHESTRATOR_VERSION},
        }

    # ── Python formatting (replaces 31-second LLM call) ──────────────

    def _format_result(self, tool_name: str, result: Any, hebrew: bool) -> str:
        if result is None or isinstance(result, bool):
            return ("✅ הפעולה בוצעה בהצלחה." if hebrew else "✅ Operation completed.") if result else \
                   ("❌ הפעולה נכשלה." if hebrew else "❌ Operation failed.")
        if isinstance(result, str):
            return result
        if isinstance(result, dict) and result.get("error"):
            return self._format_error(str(result["error"]), hebrew)

        if "list_templates" in tool_name:
            return self._fmt_templates(result, hebrew)
        elif "list_contacts" in tool_name:
            return self._fmt_contacts(result, hebrew)
        elif "list_documents" in tool_name:
            return self._fmt_documents(result, hebrew)
        elif "login" in tool_name:
            return self._fmt_login(result, hebrew)
        elif "get_user" in tool_name or "check_auth" in tool_name:
            return self._fmt_user_info(result, hebrew)
        elif "add_field" in tool_name or "add_signature" in tool_name:
            return self._fmt_fields(result, hebrew)
        elif "send_" in tool_name:
            return self._fmt_sent(result, hebrew)
        elif "create_contact" in tool_name:
            return self._fmt_created(result, hebrew, "איש קשר" if hebrew else "Contact")
        elif "create_template" in tool_name:
            return self._fmt_created(result, hebrew, "תבנית" if hebrew else "Template")
        elif "get_document" in tool_name or "get_template" in tool_name:
            return self._fmt_detail(result, hebrew)
        else:
            return self._fmt_generic(result, hebrew)

    def _fmt_templates(self, data: Any, he: bool) -> str:
        templates = []
        if isinstance(data, dict):
            # Handle various nesting: {templates:[...]}, {success:true, templates:[...]}, etc.
            for key in ("templates", "data"):
                val = data.get(key)
                if isinstance(val, list):
                    templates = val
                    break
                if isinstance(val, dict) and "templates" in val:
                    templates = val["templates"]
                    break
            if not templates and isinstance(data.get("templates"), list):
                templates = data["templates"]
        if not templates:
            return "לא נמצאו תבניות." if he else "No templates found."

        title = f"📋 {'התבניות שלך' if he else 'Your Templates'} ({len(templates)}):\n\n"
        lines = []
        for i, t in enumerate(templates[:20], 1):
            name = t.get("name", "?") if isinstance(t, dict) else str(t)
            lines.append(f"{i}. {name}")

        actions = "\n\nמה תרצה לעשות?\n• צפה בפרטי תבנית\n• צור תבנית חדשה\n• שלח מסמך מתבנית" if he else \
                  "\n\nWhat would you like to do?\n• View template details\n• Create a new template\n• Send document from template"
        return title + "\n".join(lines) + actions

    def _fmt_contacts(self, data: Any, he: bool) -> str:
        contacts = []
        if isinstance(data, dict):
            c = data.get("contacts", data)
            if isinstance(c, dict):
                contacts = c.get("contacts", [])
            elif isinstance(c, list):
                contacts = c
        if not contacts:
            return "לא נמצאו אנשי קשר." if he else "No contacts found."

        title = f"👥 {'אנשי הקשר שלך' if he else 'Your Contacts'} ({len(contacts)}):\n\n"
        lines = []
        for i, c in enumerate(contacts[:15], 1):
            name = c.get("name", "?")
            email = c.get("email", "")
            phone = c.get("phone", "")
            detail = f" - {email}" if email else ""
            if phone:
                detail += f" | {phone}"
            lines.append(f"{i}. **{name}**{detail}")

        actions = "\n\nמה תרצה לעשות?\n• הוסף איש קשר חדש\n• עדכן פרטי איש קשר\n• שלח מסמך לאיש קשר" if he else \
                  "\n\nWhat would you like to do?\n• Add a new contact\n• Update contact details\n• Send document to contact"
        return title + "\n".join(lines) + actions

    def _fmt_documents(self, data: Any, he: bool) -> str:
        docs = []
        if isinstance(data, dict):
            docs = data.get("documentCollections", data.get("documents", []))
        if not docs:
            return "לא נמצאו מסמכים." if he else "No documents found."

        title = f"📄 {'המסמכים שלך' if he else 'Your Documents'} ({len(docs)}):\n\n"
        lines = []
        for i, d in enumerate(docs[:15], 1):
            name = d.get("name", d.get("title", "?"))
            status = d.get("statusName", d.get("status", "פעיל" if he else "Active"))
            if status in ("Unknown", "null", None, ""):
                status = "פעיל" if he else "Active"
            lines.append(f"{i}. {name} - {status}")

        actions = "\n\nמה תרצה לעשות?\n• צפה בפרטי מסמך\n• צור מסמך חדש\n• שלח מסמך לחתימה" if he else \
                  "\n\nWhat would you like to do?\n• View document details\n• Create a new document\n• Send document for signing"
        return title + "\n".join(lines) + actions

    def _fmt_login(self, data: Any, he: bool) -> str:
        if isinstance(data, dict):
            user = data.get("user", data)
            name = user.get("name", "")
            email = user.get("email", "")
            if he:
                return f"✅ התחברות הצליחה!\n\n👤 שם: {name}\n📧 אימייל: {email}\n\nמה תרצה לעשות?\n• הצג תבניות\n• הצג אנשי קשר\n• הצג מסמכים"
            return f"✅ Login successful!\n\n👤 Name: {name}\n📧 Email: {email}\n\nWhat would you like to do?\n• View templates\n• View contacts\n• View documents"
        return "✅ Login successful!" if not he else "✅ התחברות הצליחה!"

    def _fmt_user_info(self, data: Any, he: bool) -> str:
        if isinstance(data, dict):
            name = data.get("name", "?")
            email = data.get("email", "?")
            role = data.get("type", data.get("role", "?"))
            if he:
                return f"👤 פרטי המשתמש:\n\nשם: {name}\nאימייל: {email}\nתפקיד: {role}"
            return f"👤 User Info:\n\nName: {name}\nEmail: {email}\nRole: {role}"
        return str(data)

    def _fmt_created(self, data: Any, he: bool, entity: str) -> str:
        if he:
            return f"✅ {entity} נוצר בהצלחה!\n\n{json.dumps(data, ensure_ascii=False, indent=2, default=str)[:200]}"
        return f"✅ {entity} created successfully!\n\n{json.dumps(data, ensure_ascii=False, indent=2, default=str)[:200]}"

    def _fmt_fields(self, data: Any, he: bool) -> str:
        if isinstance(data, dict):
            count = data.get("fieldsAdded", data.get("count", 1))
            position = data.get("position", data.get("preset", ""))
            if he:
                return f"✅ {count} שדות חתימה נוספו בהצלחה!\n\nמיקום: {position}\n\nמה תרצה לעשות?\n• הוסף שדות נוספים\n• שלח את המסמך לחתימה\n• צפה במסמך"
            return f"✅ {count} signature field(s) added successfully!\n\nPosition: {position}\n\nWhat would you like to do?\n• Add more fields\n• Send document for signing\n• View document"
        return self._fmt_generic(data, he)

    def _fmt_sent(self, data: Any, he: bool) -> str:
        if isinstance(data, dict):
            doc_name = data.get("documentName", data.get("name", ""))
            signer = data.get("signer", {})
            signer_name = signer.get("name", "") if isinstance(signer, dict) else str(signer)
            if he:
                return f"✅ המסמך \"{doc_name}\" נשלח בהצלחה!\n\nנשלח ל: {signer_name}\n\nמה תרצה לעשות?\n• בדוק סטטוס חתימה\n• שלח מסמך נוסף\n• הצג מסמכים"
            return f"✅ Document \"{doc_name}\" sent successfully!\n\nSent to: {signer_name}\n\nWhat would you like to do?\n• Check signing status\n• Send another document\n• View documents"
        if isinstance(data, str) and "error" in data.lower():
            prefix = "שגיאה בשליחה" if he else "Send error"
            return f"❌ {prefix}: {data}"
        return self._fmt_generic(data, he)

    def _fmt_detail(self, data: Any, he: bool) -> str:
        if isinstance(data, dict):
            lines = []
            for k, v in data.items():
                if v is not None and v != "" and k not in ("id", "companyId", "groupId"):
                    lines.append(f"**{k}**: {v}")
            return "\n".join(lines[:15])
        return str(data)

    def _format_error(self, error: str, he: bool) -> str:
        if "500" in error:
            return "❌ השרת חווה שגיאה. נסה שוב מאוחר יותר." if he else "❌ Server error. Please try again later."
        if "401" in error or "403" in error:
            return "🔒 אין הרשאה. התחבר מחדש." if he else "🔒 Not authorized. Please log in again."
        if "400" in error:
            return "⚠️ הבקשה לא תקינה. בדוק את הפרטים ונסה שוב." if he else "⚠️ Invalid request. Please check your input."
        if "404" in error:
            return "🔍 לא נמצא. ודא שהפרטים נכונים." if he else "🔍 Not found. Please verify the details."
        return '❌ שגיאה לא צפויה.' if he else '❌ Unexpected error.'

    def _fmt_generic(self, data: Any, he: bool) -> str:
        if isinstance(data, dict):
            nice = json.dumps(data, ensure_ascii=False, indent=2, default=str)
            if len(nice) > 500:
                nice = nice[:500] + "..."
            prefix = "✅ הפעולה בוצעה בהצלחה:" if he else "✅ Operation completed:"
            return f"{prefix}\n\n{nice}"
        return f"✅ {data}"

    # ── helpers ──────────────────────────────────────────────────────

    def _resolve_template_id(self, args: dict) -> dict:
        """Replace template name with GUID if found in cache."""
        for key in ("templateId", "template_id", "sourceTemplateId"):
            val = args.get(key, "")
            if val and not __import__('re').match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', val, __import__('re').I):  # Not a valid GUID
                guid = self.template_cache.get(val)
                if guid:
                    args[key] = guid
                    logger.info(f"Resolved template '{val}' → {guid}")
        return args

    def _cache_templates(self, result: Any):
        """Extract template name→GUID mappings from list_templates result."""
        if not isinstance(result, dict):
            return
        templates = result.get("templates", [])
        if isinstance(templates, dict):
            templates = templates.get("templates", [])
        for t in templates:
            if isinstance(t, dict):
                name = t.get("name")
                tid = t.get("templateId")
                if name and tid:
                    self.template_cache[name] = str(tid)
        if self.template_cache:
            logger.info(f"Cached {len(self.template_cache)} template IDs")

    KEYWORD_ROUTES = {
        "template": "wesign_list_templates", "templates": "wesign_list_templates",
        "תבנית": "wesign_list_templates", "תבניות": "wesign_list_templates",
        "contact": "wesign_list_contacts", "contacts": "wesign_list_contacts",
        "קשר": "wesign_list_contacts", "אנשי קשר": "wesign_list_contacts",
        "document": "wesign_list_documents", "documents": "wesign_list_documents",
        "מסמך": "wesign_list_documents", "מסמכים": "wesign_list_documents",
    }

    def _try_keyword_route(self, message: str) -> Optional[str]:
        msg = message.lower()
        triggers = ["list", "show", "all", "הצג", "רשימה", "הראה", "כל"]
        if any(t in msg for t in triggers):
            for keyword, tool in self.KEYWORD_ROUTES.items():
                if keyword in msg or keyword in message:
                    return tool
        return None

    def _parse_tool_from_text(self, content: str) -> Optional[list]:
        match = re.search(r'\{"name":\s*"(wesign_\w+)".*?"arguments":\s*(\{[^}]*\})', content, re.DOTALL)
        if match:
            try:
                args = json.loads(match.group(2))
            except json.JSONDecodeError:
                args = {}
            return [{"id": f"p_{match.group(1)}", "type": "function",
                     "function": {"name": match.group(1), "arguments": json.dumps(args)}}]
        return None

    def _chunked(self, text: str, size: int) -> list:
        return [text[i:i+size] for i in range(0, len(text), size)]

    def _sse(self, data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    def _store(self, conv_id: str, user_msg: str, assistant_msg: str):
        if conv_id not in self.conversations:
            self.conversations[conv_id] = []
        self.conversations[conv_id].append({"role": "user", "content": user_msg})
        self.conversations[conv_id].append({"role": "assistant", "content": assistant_msg})
        # Persist conversations to file
        try:
            with open("/tmp/wesign-conversations.json", "w") as f:
                json.dump(dict(list(self.conversations.items())[-50:]), f, ensure_ascii=False, default=str)
        except Exception:
            pass

    async def _call_llm(self, messages: list, tools: Optional[list] = None) -> dict:
        body: Dict[str, Any] = {"model": self.llm_model, "messages": messages, "temperature": 0.3, "stream": False}
        if tools:
            body["tools"] = tools
            body["tool_choice"] = "auto"
        resp = await self._http.post(f"{self.llm_base_url}/chat/completions", json=body,
                                      headers={"Authorization": f"Bearer {self.llm_api_key}"})
        resp.raise_for_status()
        return resp.json()

    async def _execute_mcp_tool(self, tool_name: str, args: dict) -> Any:
        try:
            resp = await self._http.post(f"{self.mcp_url}/execute", json={"tool": tool_name, "parameters": args})
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", data) if data.get("success") else {"error": data.get("error", "Failed")}
        except Exception as e:
            return {"error": str(e)}

    def get_agent_status(self) -> Dict[str, Any]:
        return {"total_agents": 1, "agents": ["direct-mcp-streaming"],
                "conversations": len(self.conversations), "mcp_tools": {"wesign": len(self.openai_tools)}}
