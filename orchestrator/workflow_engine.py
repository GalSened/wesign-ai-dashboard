"""
WeSign Workflow Engine — Multi-step operation orchestration

Decomposes complex user requests into ordered steps, executes them
sequentially with context passing, and asks clarifying questions
when information is missing.

Architecture:
  User message → decompose → [step1, step2, step3, ...]
  Execute step1 → result → inject into step2 context → execute → ...
  If missing info → return question → wait for user → resume

This replaces LLM reasoning for multi-tool workflows.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from intent_engine import classify, _resolve, _normalize_pos, _detect_field_type


# ── Step definition ─────────────────────────────────────────────────

class WorkflowStep:
    def __init__(self, tool: str, params: Dict[str, Any], description: str = ""):
        self.tool = tool
        self.params = params
        self.description = description
        self.result: Any = None
        self.executed = False


class WorkflowPlan:
    def __init__(self, steps: List[WorkflowStep], questions: List[str] = None):
        self.steps = steps
        self.questions = questions or []  # Questions to ask before executing

    @property
    def needs_clarification(self) -> bool:
        return len(self.questions) > 0


# ── Message decomposition ──────────────────────────────────────────

# Conjunction splitters (Hebrew + English)
SPLIT_PATTERNS = [
    r"\s+(?:ו(?:גם|אז)?|ואח[\"״]כ|ולאחר מכן|ואחרי זה)\s+",  # Hebrew: ו, וגם, ואח"כ
    r"\s+(?:and then|and also|and|then|after that|also)\s+",  # English
    r"\s*,\s+(?:ו|and|then)\s+",  # Comma + conjunction
]

def split_message(message: str) -> List[str]:
    """Split a complex message into sub-operations by conjunctions."""
    parts = [message]
    for pattern in SPLIT_PATTERNS:
        new_parts = []
        for part in parts:
            splits = re.split(pattern, part, flags=re.IGNORECASE)
            new_parts.extend(s.strip() for s in splits if s.strip())
        parts = new_parts
    return parts if len(parts) > 1 else [message]


# ── Context extraction from results ────────────────────────────────

def extract_context(tool: str, result: Any) -> Dict[str, Any]:
    """Extract useful IDs and data from a tool result for next steps."""
    ctx = {}
    if not isinstance(result, dict):
        return ctx

    # Document IDs
    if "documentCollectionId" in str(result) or "list_documents" in tool or "search_documents" in tool:
        docs = result.get("documentCollections", result.get("documents", []))
        if isinstance(docs, list) and docs:
            ctx["last_document_id"] = docs[0].get("id", docs[0].get("documentCollectionId", ""))
            ctx["last_document_name"] = docs[0].get("name", "")
        if isinstance(result, dict):
            ctx["last_document_id"] = result.get("documentCollectionId", result.get("id", ctx.get("last_document_id", "")))

    # Template IDs
    if "template" in tool.lower():
        templates = result.get("templates", [])
        if isinstance(templates, list) and templates:
            ctx["last_template_id"] = templates[0].get("templateId", "")
            ctx["last_template_name"] = templates[0].get("name", "")
        if result.get("templateId"):
            ctx["last_template_id"] = result["templateId"]
        if result.get("newTemplateId"):
            ctx["last_template_id"] = result["newTemplateId"]

    # Contact info
    if "contact" in tool.lower():
        contacts = result.get("contacts", {})
        if isinstance(contacts, dict):
            contacts = contacts.get("contacts", [])
        if isinstance(contacts, list) and contacts:
            ctx["last_contact_name"] = contacts[0].get("name", "")
            ctx["last_contact_email"] = contacts[0].get("email", "")

    # Page count
    if "page_count" in tool:
        ctx["page_count"] = result.get("pageCount", 1)

    return ctx


# ── Workflow detection patterns ─────────────────────────────────────

def detect_field_count(msg: str) -> int:
    """Detect how many fields the user wants to add."""
    m = re.search(r"(\d+)\s+(?:fields?|שדות|שדה)", msg, re.IGNORECASE)
    if m:
        return int(m.group(1))
    if any(w in msg for w in ["שתי", "שני", "two", "both", "2"]):
        return 2
    if any(w in msg for w in ["שלוש", "three", "3"]):
        return 3
    return 1


def detect_signer_count(msg: str) -> int:
    """Detect how many signers."""
    m = re.search(r"(\d+)\s+(?:signers?|חותמים|חתומים)", msg, re.IGNORECASE)
    if m:
        return int(m.group(1))
    if any(w in msg for w in ["שני", "שתי", "both", "two", "2", "בני הזוג"]):
        return 2
    if any(w in msg for w in ["שלוש", "three", "3"]):
        return 3
    return 1


def extract_emails(msg: str) -> List[str]:
    """Extract email addresses from message."""
    return re.findall(r'\b[\w.-]+@[\w.-]+\.\w+\b', msg)


def extract_document_name(msg: str) -> Optional[str]:
    """Extract document/template name from message."""
    # Hebrew: "את ה..." pattern
    m = re.search(r"(?:את\s+ה?|the\s+|document\s+|מסמך\s+|תבנית\s+|template\s+)[\"']?(.+?)[\"']?(?:\s+(?:ו|and|,)|$)", msg, re.IGNORECASE)
    if m:
        name = m.group(1).strip()
        # Clean up trailing conjunctions
        name = re.sub(r"\s+(?:ו|and|then|,).*$", "", name).strip()
        if len(name) > 2:
            return name
    return None


def detect_positions_for_signers(count: int) -> List[str]:
    """Generate default field positions for multiple signers."""
    if count == 1:
        return ["bottom-right"]
    if count == 2:
        return ["bottom-left", "bottom-right"]
    if count == 3:
        return ["bottom-left", "bottom-center", "bottom-right"]
    return [f"bottom-right" for _ in range(count)]


# ── Main workflow planner ───────────────────────────────────────────

def plan_workflow(message: str, template_cache: Dict[str, str] = None,
                  workflow_context: Dict[str, Any] = None) -> Optional[WorkflowPlan]:
    """
    Analyze a complex message and create a multi-step workflow plan.

    Returns:
        WorkflowPlan with steps + any clarifying questions
        None if this is a simple single-step operation (use intent engine)
    """
    cache = template_cache or {}
    ctx = workflow_context or {}
    msg = message.strip()
    msg_lower = msg.lower()

    # Check if this is a multi-step request
    parts = split_message(msg)
    has_multiple_actions = len(parts) > 1

    # Also check for implicit multi-step patterns
    has_load_and_send = (
        any(w in msg for w in ["load", "upload", "טען", "העלה", "get", "שלוף"]) and
        any(w in msg for w in ["send", "שלח"])
    )
    has_add_and_send = (
        any(w in msg for w in ["add", "הוסף", "שים", "put"]) and
        any(w in msg for w in ["send", "שלח"])
    )
    has_create_and_add = (
        any(w in msg for w in ["create", "צור", "new", "חדש"]) and
        any(w in msg for w in ["add", "הוסף", "field", "שדה"])
    )

    is_multi_step = has_multiple_actions or has_load_and_send or has_add_and_send or has_create_and_add

    if not is_multi_step:
        return None  # Single step — use intent engine

    # ── Build workflow plan ──────────────────────────────────

    steps: List[WorkflowStep] = []
    questions: List[str] = []

    doc_name = extract_document_name(msg)
    emails = extract_emails(msg)
    field_count = detect_field_count(msg)
    signer_count = detect_signer_count(msg)
    field_type = _detect_field_type(msg)
    positions = detect_positions_for_signers(max(field_count, signer_count))

    # Step 1: Find/load the document or template
    if doc_name:
        tid = _resolve(doc_name, cache)
        is_template = tid != doc_name or any(w in msg_lower for w in ["template", "תבנית"])

        if is_template or tid in cache.values():
            steps.append(WorkflowStep(
                tool="wesign_list_templates",
                params={},
                description=f"Finding template: {doc_name}"
            ))
        else:
            steps.append(WorkflowStep(
                tool="wesign_search_documents",
                params={"query": doc_name},
                description=f"Searching for document: {doc_name}"
            ))
    elif ctx.get("last_template_id") or ctx.get("last_document_id"):
        pass  # We already have context from previous turn
    else:
        steps.append(WorkflowStep(
            tool="wesign_list_documents",
            params={"limit": 5},
            description="Loading recent documents"
        ))

    # Step 2: Add fields (if requested)
    if any(w in msg for w in ["field", "שדה", "שדות", "חתימה", "signature", "add", "הוסף"]):
        for i, pos in enumerate(positions[:field_count]):
            template_ref = doc_name or "$context.last_template_id"
            if doc_name:
                template_ref = _resolve(doc_name, cache)
            steps.append(WorkflowStep(
                tool="wesign_add_field_smart",
                params={
                    "templateId": template_ref,
                    "fields": [{
                        "type": field_type,
                        "name": f"{field_type}_{i+1}",
                        "page": 1,
                        "position": pos,
                    }]
                },
                description=f"Adding {field_type} field at {pos} (signer {i+1})"
            ))

    # Step 3: Send (if requested)
    if any(w in msg for w in ["send", "שלח"]):
        if emails:
            for email in emails[:signer_count]:
                steps.append(WorkflowStep(
                    tool="wesign_send_simple_document",
                    params={
                        "signerMeans": email,
                        "signerName": email.split("@")[0],
                        "templateId": "$context.last_template_id",
                        "documentName": doc_name or "Document",
                    },
                    description=f"Sending to {email}"
                ))
        else:
            # Missing email info — ask
            is_hebrew = any("\u0590" <= c <= "\u05FF" for c in msg)
            if signer_count > 1:
                questions.append(
                    f"מצאתי את המסמך והוספתי {field_count} שדות חתימה. "
                    f"כדי לשלוח, אני צריך את כתובות האימייל של {signer_count} החותמים. "
                    f"מה הכתובות?"
                    if is_hebrew else
                    f"Document found and {field_count} signature fields added. "
                    f"To send, I need the email addresses of {signer_count} signers. "
                    f"What are their emails?"
                )
            else:
                questions.append(
                    "לאיזה אימייל לשלוח את המסמך?"
                    if is_hebrew else
                    "What email should I send the document to?"
                )

    if not steps and not questions:
        return None

    return WorkflowPlan(steps=steps, questions=questions)
