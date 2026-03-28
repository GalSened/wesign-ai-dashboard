"""
WeSign Intent Engine — Deterministic NLU for WeSign operations

Replaces LLM for ~80% of requests with instant regex pattern matching.
Falls back to LLM only for ambiguous/complex requests.

Pattern: classify(message) → (tool_name, params) or None (use LLM)
"""

import re
from typing import Optional, Tuple, Dict, Any, List

# ── Simple list intents (no entity extraction needed) ────────────────

INTENTS = {
    "list_templates":   {"tool": "wesign_list_templates",    "params": {}},
    "list_contacts":    {"tool": "wesign_list_contacts",     "params": {}},
    "list_documents":   {"tool": "wesign_list_documents",    "params": {}},
    "search_documents": {"tool": "wesign_search_documents",  "params": {}},
    "get_user_info":    {"tool": "wesign_get_user_info",     "params": {}},
    "check_auth":       {"tool": "wesign_check_auth_status", "params": {}},
    "list_groups":      {"tool": "wesign_list_contact_groups","params": {}},
}

# ── Pattern rules: (regex, intent_key) ──────────────────────────────

LIST_RULES: List[Tuple[str, str]] = [
    # English
    (r"\b(show|list|display|get|view|all)\b.*\b(template|templates)\b", "list_templates"),
    (r"\b(show|list|display|get|view|all)\b.*\b(contact|contacts|address)\b", "list_contacts"),
    (r"\b(show|list|display|get|view|all)\b.*\b(document|documents|doc|docs|file|files)\b", "list_documents"),
    (r"\b(search|find|look)\b.*\b(document|documents|doc|docs)\b", "search_documents"),
    (r"\b(show|list|display|get|view)\b.*\b(group|groups)\b", "list_groups"),
    (r"\b(my|user|account|profile)\b.*\b(info|information|details|profile)\b", "get_user_info"),
    (r"\bwho am i\b", "get_user_info"),
    # Hebrew
    (r"הצג.*תבניות|רשימת.*תבניות|כל.*התבניות|תבניות.*שלי", "list_templates"),
    (r"הצג.*תבנית|הראה.*תבנית", "list_templates"),
    (r"הצג.*אנשי.*קשר|רשימת.*אנשי.*קשר|כל.*אנשי.*קשר|אנשי.*קשר.*שלי", "list_contacts"),
    (r"הצג.*קשר|הראה.*קשר", "list_contacts"),
    (r"הצג.*מסמכים|רשימת.*מסמכים|כל.*המסמכים|מסמכים.*שלי", "list_documents"),
    (r"הצג.*מסמך|הראה.*מסמך", "list_documents"),
    (r"חפש.*מסמך|חפש.*מסמכים|חיפוש.*מסמך", "search_documents"),
    (r"הצג.*קבוצות|רשימת.*קבוצות", "list_groups"),
    (r"מי אני|פרטי.*משתמש|פרטים.*שלי|מידע.*חשבון", "get_user_info"),
]

# ── Entity extraction patterns ──────────────────────────────────────

RE_CREATE_CONTACT = re.compile(
    r"(?:create|add|new|make|צור|הוסף)\s+(?:a\s+)?(?:contact|איש\s*קשר)\s+"
    r"(?:named?\s+|בשם\s+)?(.+?)(?:\s+(?:email|אימייל|מייל|דואר)\s+(\S+@\S+))?"
    r"(?:\s+(?:phone|טלפון)\s+([\d\-+]+))?$",
    re.IGNORECASE
)

RE_DELETE_TEMPLATE = re.compile(
    r"(?:delete|remove|מחק|הסר)\s+(?:the\s+)?(?:template|תבנית)\s+[\"']?(.+?)[\"']?\s*$",
    re.IGNORECASE
)

RE_DELETE_DOCUMENT = re.compile(
    r"(?:delete|remove|מחק|הסר)\s+(?:the\s+)?(?:document|doc|מסמך)\s+[\"']?(.+?)[\"']?\s*$",
    re.IGNORECASE
)

RE_DUPLICATE_TEMPLATE = re.compile(
    r"(?:duplicate|copy|clone|שכפל|העתק)\s+(?:the\s+)?(?:template|תבנית)\s+[\"']?(.+?)[\"']?"
    r"(?:\s+(?:as|to|named?|with\s+name|בשם|ל)\s+[\"']?(.+?)[\"']?)?\s*$",
    re.IGNORECASE
)

RE_ADD_FIELD = re.compile(
    r"(?:add|put|place|הוסף|שים)\s+"
    r"(?:a\s+)?(?:signature|initial|initials|text|date|checkbox|חתימה|ראשי\s*תיבות|טקסט|תאריך|תיבת\s*סימון)"
    r"\s*(?:field\s+)?(?:to\s+|ל)?(?:template\s+|תבנית\s+)?[\"']?(.+?)[\"']?\s+"
    r"(?:at\s+|ב|in\s+)?(?:the\s+)?(.+?)(?:\s+(?:on|in|ב)\s+(?:page\s+|עמוד\s+)?(\d+))?\s*$",
    re.IGNORECASE
)

RE_PAGE_COUNT = re.compile(
    r"(?:how many|number of|count|כמה)\s+(?:pages?|עמודים)\s+"
    r"(?:in|of|does|ב|של|יש\s+ל)?\s*(?:template\s+|תבנית\s+)?[\"']?(.+?)[\"']?\s*(?:have)?\s*\??\s*$",
    re.IGNORECASE
)

RE_SEND_TO_EMAIL = re.compile(
    r"(?:send|שלח)\s+(?:a\s+)?(?:document|doc|מסמך|template|תבנית)?\s*"
    r"(?:to\s+|ל)(\S+@\S+)",
    re.IGNORECASE
)

# Matches "send to [name]" (without email) — needs SmartContext resolution
RE_SEND_TO_NAME = re.compile(
    r"(?:send|שלח)\s+(?:a\s+)?(?:document|doc|מסמך|template|תבנית)?\s*"
    r"(?:to\s+|ל)\s*[\"']?(.+?)[\"']?\s*$",
    re.IGNORECASE
)

# ── Position normalization ──────────────────────────────────────────

_POS_MAP = {
    "top left": "top-left", "top-left": "top-left", "upper left": "top-left",
    "top right": "top-right", "top-right": "top-right", "upper right": "top-right",
    "center left": "center-left", "center-left": "center-left", "middle left": "center-left",
    "center right": "center-right", "center-right": "center-right", "middle right": "center-right",
    "bottom left": "bottom-left", "bottom-left": "bottom-left", "lower left": "bottom-left",
    "bottom right": "bottom-right", "bottom-right": "bottom-right", "lower right": "bottom-right",
    "למטה מימין": "bottom-right", "למטה משמאל": "bottom-left",
    "למעלה מימין": "top-right", "למעלה משמאל": "top-left",
    "למטה ימין": "bottom-right", "למטה שמאל": "bottom-left",
    "למעלה ימין": "top-right", "למעלה שמאל": "top-left",
    "אמצע ימין": "center-right", "אמצע שמאל": "center-left",
}


def _normalize_pos(raw: str) -> str:
    clean = raw.lower().strip().replace("_", " ").replace("-", " ")
    for pattern, norm in _POS_MAP.items():
        if pattern in clean:
            return norm
    return "bottom-right"


def _detect_field_type(msg: str) -> str:
    msg_l = msg.lower()
    if any(w in msg_l for w in ["initial", "initials", "ראשי תיבות"]):
        return "initials"
    if any(w in msg_l for w in ["text", "טקסט"]):
        return "text"
    if any(w in msg_l for w in ["date", "תאריך"]):
        return "date"
    if any(w in msg_l for w in ["checkbox", "תיבת סימון"]):
        return "checkbox"
    return "signature"


def _resolve(name: str, cache: Dict[str, str]) -> str:
    """Resolve template/doc name → GUID via cache."""
    if re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-", name, re.I):
        return name
    # Exact
    if name in cache:
        return cache[name]
    # Case-insensitive
    for k, v in cache.items():
        if k.lower() == name.lower():
            return v
    # Partial
    for k, v in cache.items():
        if name.lower() in k.lower() or k.lower() in name.lower():
            return v
    return name


# ── Main entry point ────────────────────────────────────────────────

def classify(message: str, template_cache: Dict[str, str] = None) -> Optional[Tuple[str, Dict[str, Any]]]:
    """
    Classify a user message into (tool_name, params).
    Returns None if the message is ambiguous and needs LLM.
    """
    msg = message.strip()
    cache = template_cache or {}

    # 1. List/show intents (most common — ~60% of requests)
    for pattern, intent_key in LIST_RULES:
        if re.search(pattern, msg, re.IGNORECASE):
            intent = INTENTS[intent_key]
            return (intent["tool"], intent["params"].copy())

    # 2. Create contact
    m = RE_CREATE_CONTACT.search(msg)
    if m:
        name_parts = m.group(1).strip().split()
        return ("wesign_create_contact", {
            "firstName": name_parts[0] if name_parts else "Contact",
            "lastName": " ".join(name_parts[1:]) if len(name_parts) > 1 else "",
            "email": m.group(2) or "",
            "phone": m.group(3) or "",
        })

    # 3. Delete template
    m = RE_DELETE_TEMPLATE.search(msg)
    if m:
        return ("wesign_delete_template", {"templateId": _resolve(m.group(1).strip(), cache)})

    # 4. Delete document
    m = RE_DELETE_DOCUMENT.search(msg)
    if m:
        return ("wesign_delete_document", {"documentCollectionId": m.group(1).strip()})

    # 5. Duplicate template
    m = RE_DUPLICATE_TEMPLATE.search(msg)
    if m:
        name = m.group(1).strip()
        new_name = m.group(2).strip() if m.group(2) else f"Copy of {name}"
        return ("wesign_duplicate_template", {
            "templateId": _resolve(name, cache),
            "newName": new_name,
        })

    # 6. Add field to template
    m = RE_ADD_FIELD.search(msg)
    if m:
        template = m.group(1).strip()
        position = _normalize_pos(m.group(2))
        page = int(m.group(3)) if m.group(3) else 1
        ftype = _detect_field_type(msg)
        return ("wesign_add_field_smart", {
            "templateId": _resolve(template, cache),
            "fields": [{"type": ftype, "name": f"{ftype}_1", "page": page, "position": position}],
        })

    # 7. Page count
    m = RE_PAGE_COUNT.search(msg)
    if m:
        return ("wesign_get_page_count", {"templateId": _resolve(m.group(1).strip(), cache)})

    # 8. Send to email (direct)
    m = RE_SEND_TO_EMAIL.search(msg)
    if m:
        email = m.group(1)
        return ("wesign_send_simple_document", {
            "signerMeans": email,
            "signerName": email.split("@")[0],
        })

    # 9. Send to name (needs SmartContext resolution — mark for async resolution)
    m = RE_SEND_TO_NAME.search(msg)
    if m:
        signer_ref = m.group(1).strip()
        if signer_ref and len(signer_ref) > 1:
            return ("__smart_send__", {
                "signerReference": signer_ref,
            })

    # Not confident — LLM fallback
    return None
