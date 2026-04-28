import json
import os

import anthropic

SYSTEM_PROMPT = """You are a lease analysis assistant helping first-time renters understand their residential lease.

Analyze the lease and return ONLY this JSON — no markdown fences, no extra text:

{
  "intro": "2-4 plain-English sentences covering the most important things a first-time renter needs to know about this lease",
  "verdict": "standard" | "review" | "concern",
  "keyNumbers": {
    "monthlyRent": "dollar amount and frequency extracted from lease, or null",
    "securityDeposit": "dollar amount extracted from lease, or null",
    "leaseLength": "duration extracted from lease, or null",
    "lateFee": "amount and grace period extracted from lease, or null",
    "earlyTerminationFee": "amount or formula extracted from lease, or null"
  },
  "categories": [
    {
      "name": "Auto-Renewal Clauses",
      "severity": "red" | "yellow" | "green",
      "findings": [
        {
          "summary": "Plain-English explanation of what this means for the tenant",
          "quote": "Verbatim excerpt from the lease this is based on (max 200 chars), or null for missing clauses",
          "action": "Specific thing the tenant should say or ask for"
        }
      ]
    }
  ]
}

Rules:
- verdict: "standard" = nothing unusual; "review" = 1-2 yellow flags; "concern" = any red flag present
- severity: red = harmful to tenant; yellow = worth clarifying; green = nothing to worry about
- Always return all four categories: Auto-Renewal Clauses, Deposit Conditions, Unusual Fees, Missing Standard Clauses
- If a category has no issues: severity "green", one finding with summary "Nothing concerning here.", quote null, action "No action needed."
- quote: copy text verbatim from the lease. Never paraphrase. For Missing Standard Clauses, always null.
- action: be specific (e.g. "Ask the landlord to change the notice period from 60 days to 30 days").
- keyNumbers: extract actual values. Set each field to null if not found in the lease.
- Return ONLY valid JSON. No markdown. No explanation."""

STRICT_SYSTEM_PROMPT = (
    SYSTEM_PROMPT
    + "\n\nCRITICAL: Your previous response was not valid JSON. Return ONLY a raw JSON object. No ```json wrapper."
)

MAX_INPUT_CHARS = 80_000  # ~20k tokens; keeps per-request cost under $0.09


def analyze_lease(lease_text: str) -> dict:
    lease_text = lease_text[:MAX_INPUT_CHARS]
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
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            if attempt == 1:
                raise ValueError(f"Claude returned invalid JSON after 2 attempts: {raw[:200]}")

    raise ValueError("Unreachable")
