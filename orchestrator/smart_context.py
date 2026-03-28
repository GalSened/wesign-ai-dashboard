"""
WeSign Smart Context — Proactive data resolution

Instead of asking questions, this module cross-references WeSign data
to auto-fill missing parameters and make smart suggestions.

Key behaviors:
  "send to David"    → searches contacts → finds david@comda.co.il → sends
  "prepare contract" → finds doc → checks fields → adds if missing → suggests signers
  "add fields"       → gets page count → adds to all pages automatically
"""

import re
import logging
from typing import Dict, Any, Optional, List, Tuple

logger = logging.getLogger(__name__)


class SmartContext:
    """Cross-references WeSign data to resolve ambiguous references."""

    def __init__(self, execute_tool):
        """
        Args:
            execute_tool: async function(tool_name, params) → result
        """
        self._execute = execute_tool
        self._contacts_cache: List[Dict] = []
        self._contacts_loaded = False

    async def _ensure_contacts(self):
        """Lazy-load contacts on first reference."""
        if not self._contacts_loaded:
            try:
                result = await self._execute("wesign_list_contacts", {"limit": 200})
                contacts = result.get("contacts", result) if isinstance(result, dict) else []
                if isinstance(contacts, dict):
                    contacts = contacts.get("contacts", [])
                self._contacts_cache = contacts if isinstance(contacts, list) else []
                self._contacts_loaded = True
                logger.info(f"Smart context: cached {len(self._contacts_cache)} contacts")
            except Exception as e:
                logger.error(f"Smart context: failed to load contacts: {e}")
                self._contacts_cache = []

    # ── Contact resolution ──────────────────────────────────────────

    async def resolve_signer(self, reference: str) -> Optional[Dict[str, str]]:
        """
        Resolve a signer reference (name, partial name, email) to contact details.

        Examples:
            "David"           → {"name": "David Cohen", "email": "david@co.il"}
            "דוד"             → {"name": "דוד כהן", "email": "david@co.il"}
            "david@test.com"  → {"name": "david", "email": "david@test.com"} (direct)

        Returns:
            Dict with name + email/phone, or None if not found
        """
        # If it's already an email, return directly
        if "@" in reference:
            return {"name": reference.split("@")[0], "email": reference}

        await self._ensure_contacts()

        ref_lower = reference.lower().strip()
        matches = []

        for contact in self._contacts_cache:
            name = contact.get("name", "").lower()
            email = contact.get("email", "").lower()

            # Exact name match
            if name == ref_lower:
                matches.insert(0, contact)  # Priority
            # Partial name match
            elif ref_lower in name or name in ref_lower:
                matches.append(contact)
            # First/last name match
            elif any(part == ref_lower for part in name.split()):
                matches.append(contact)

        if len(matches) == 1:
            c = matches[0]
            logger.info(f"Smart context: resolved '{reference}' → {c.get('name')} ({c.get('email')})")
            return {
                "name": c.get("name", reference),
                "email": c.get("email", ""),
                "phone": c.get("phone", ""),
                "contactId": c.get("id", ""),
            }
        elif len(matches) > 1:
            # Multiple matches — return all for user to pick
            return {
                "multiple": True,
                "matches": [
                    {"name": c.get("name"), "email": c.get("email"), "phone": c.get("phone")}
                    for c in matches[:5]
                ],
                "query": reference,
            }

        return None  # Not found

    async def resolve_signers_from_message(self, message: str) -> List[Dict]:
        """
        Extract and resolve ALL signer references from a message.

        Examples:
            "send to David and Sarah" → [resolved_david, resolved_sarah]
            "שלח לדוד ולשרה" → [resolved_david, resolved_sarah]
            "send to the Israelis" → search contacts for "Israeli" → results
        """
        signers = []

        # Extract emails directly
        emails = re.findall(r'\b[\w.-]+@[\w.-]+\.\w+\b', message)
        for email in emails:
            signers.append({"name": email.split("@")[0], "email": email})

        if signers:
            return signers

        # Extract names after "to" / "ל"
        # English: "send to David and Sarah"
        m = re.search(r"(?:to|ל)\s+(.+?)(?:\s*$|\s+(?:via|by|דרך|באמצעות))", message, re.IGNORECASE)
        if m:
            names_str = m.group(1)
            # Split by "and", "ו", comma
            names = re.split(r"\s+(?:and|ו(?:ל)?|,)\s+", names_str, flags=re.IGNORECASE)
            for name in names:
                name = name.strip().strip("'\"")
                if name:
                    resolved = await self.resolve_signer(name)
                    if resolved and not resolved.get("multiple"):
                        signers.append(resolved)
                    elif resolved and resolved.get("multiple"):
                        signers.append(resolved)  # Let the caller handle disambiguation

        return signers

    # ── Document intelligence ───────────────────────────────────────

    async def get_template_info(self, template_id: str) -> Dict[str, Any]:
        """Get template details including page count for smart field placement."""
        info = {"templateId": template_id, "pageCount": 1}
        try:
            result = await self._execute("wesign_get_page_count", {"templateId": template_id})
            if isinstance(result, dict):
                info["pageCount"] = result.get("pageCount", 1)
        except Exception:
            pass  # Use default
        return info

    # ── Smart suggestions ───────────────────────────────────────────

    def format_signer_suggestion(self, signers: List[Dict], hebrew: bool) -> str:
        """Format a signer suggestion message."""
        if not signers:
            if hebrew:
                return "לא מצאתי אנשי קשר מתאימים. לאיזה אימייל לשלוח?"
            return "No matching contacts found. What email should I send to?"

        # Check if any signer needs disambiguation
        for s in signers:
            if s.get("multiple"):
                matches = s["matches"]
                query = s["query"]
                if hebrew:
                    lines = [f"מצאתי {len(matches)} אנשי קשר בשם '{query}':"]
                    for i, m in enumerate(matches, 1):
                        lines.append(f"  {i}. {m['name']} — {m.get('email', 'ללא אימייל')}")
                    lines.append("למי לשלוח? (ציין מספר)")
                    return "\n".join(lines)
                else:
                    lines = [f"Found {len(matches)} contacts matching '{query}':"]
                    for i, m in enumerate(matches, 1):
                        lines.append(f"  {i}. {m['name']} — {m.get('email', 'no email')}")
                    lines.append("Who should I send to? (specify number)")
                    return "\n".join(lines)

        # All signers resolved — confirm
        names = [s.get("name", "?") for s in signers]
        if hebrew:
            return f"שולח ל: {', '.join(names)}"
        return f"Sending to: {', '.join(names)}"

    def format_field_suggestion(self, page_count: int, field_count: int, hebrew: bool) -> str:
        """Suggest field placement based on page count."""
        if page_count > 1 and field_count == 1:
            if hebrew:
                return f"למסמך יש {page_count} עמודים. הוספתי חתימה בעמוד האחרון (מקובל בחוזים)."
            return f"Document has {page_count} pages. Added signature on the last page (standard for contracts)."
        return ""
