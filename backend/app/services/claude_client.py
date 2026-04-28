import json
import os

import anthropic

SYSTEM_PROMPT = """You are a lease analysis assistant helping first-time renters understand their residential lease.
Analyze the lease text and return a JSON object with this exact structure:
{
  "intro": "2-4 plain-English sentences summarizing the biggest concerns for a first-time renter",
  "categories": [
    {"name": "Auto-Renewal Clauses", "severity": "red|yellow|green", "findings": ["..."]},
    {"name": "Deposit Conditions", "severity": "red|yellow|green", "findings": ["..."]},
    {"name": "Unusual Fees", "severity": "red|yellow|green", "findings": ["..."]},
    {"name": "Missing Standard Clauses", "severity": "red|yellow|green", "findings": ["..."]}
  ]
}
Severity guide: red = watch out; yellow = worth asking about; green = looks normal.
Always return all four categories. If nothing concerning, use severity "green" and findings ["No issues found — this looks normal."].
Return ONLY valid JSON. No markdown. No explanation."""

STRICT_SYSTEM_PROMPT = (
    SYSTEM_PROMPT
    + "\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY a raw JSON object."
)


def analyze_lease(lease_text: str) -> dict:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")

    for attempt in range(2):
        system = SYSTEM_PROMPT if attempt == 0 else STRICT_SYSTEM_PROMPT
        message = client.messages.create(
            model=model,
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": f"Analyze this lease:\n\n{lease_text}"}],
        )
        raw = message.content[0].text
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            if attempt == 1:
                raise ValueError(f"Claude returned invalid JSON after 2 attempts: {raw[:200]}")

    raise ValueError("Unreachable")
