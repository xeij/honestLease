# honestLease — Design Spec
**Date:** 2026-04-27
**Status:** Approved

## Overview

honestLease lets students upload a residential lease PDF and receive a one-page summary of the gotchas: auto-renewal clauses, deposit conditions, unusual fees, and missing standard clauses. No login required. Output is shareable via a unique URL. PDF is never persisted — privacy by design.

---

## Architecture

```
[User Browser]
     │
     │  1. Upload PDF
     ▼
[React App — Amplify Hosting]
     │
     │  2. POST /upload → get presigned S3 URL
     │  3. PUT PDF → S3 (direct, bypasses Lambda size limit)
     │  4. POST /analyze {s3_key}
     ▼
[API Gateway → Lambda (FastAPI + Mangum)]
     │
     ├─ 5. Fetch PDF from S3
     ├─ 6. Parse text with pdfplumber
     ├─ 7. Send to Claude API → structured JSON summary
     ├─ 8. Store summary in DynamoDB (key: short UUID)
     ├─ 9. Delete PDF from S3
     └─ 10. Return {summaryId}
     │
     ▼
[React App shows results + shareable URL]
     │  /summary/{summaryId}
     ▼
[GET /summary/{summaryId} → DynamoDB lookup → render]
```

**Infrastructure:**
- **S3 bucket:** Temp PDF staging only. Objects deleted after analysis completes.
- **DynamoDB:** Single table `summaries`, partition key `summaryId` (first 8 chars of a UUID v4, e.g. `"a3f9c12b"`), TTL set to 90 days.
- **Lambda:** Single FastAPI app (Mangum adapter), packaged with `pdfplumber` and `anthropic` SDK.
- **Amplify Hosting:** Serves the React SPA with client-side routing.
- **API Gateway:** HTTP API (not REST) for lower latency and cost.

---

## Frontend

**Tech:** React + Vite, React Query for async state, React Router for client-side routing. No Redux.

### Screens

**Upload Screen (`/`)**
- Drag-and-drop zone + file picker. PDF only, max 20MB enforced client-side.
- "Analyze my lease" button disabled until a valid file is selected.
- Brief copy explaining the four categories honestLease checks — sets expectations.
- Two-phase progress indicator: "Uploading..." → "Analyzing your lease..."

**Results Screen (`/summary/:id`)**
- Plain-English intro paragraph (2-4 sentences, friendly tone for first-time renters).
- Four categorized cards:
  - Auto-Renewal Clauses
  - Deposit Conditions
  - Unusual Fees
  - Missing Standard Clauses
- Each card: findings list + severity badge (Red = watch out, Yellow = worth asking about, Green = looks normal).
- "Copy shareable link" button — copies `window.location.href` to clipboard.
- "Analyze another lease" CTA linking back to `/`.

**Error States (inline banners, not separate pages)**
- PDF too large, scanned PDF detected, analysis timeout, invalid/expired summary ID.

---

## Backend

**Tech:** Python 3.12, FastAPI, Mangum (Lambda adapter), pdfplumber, anthropic SDK, boto3.

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Returns a presigned S3 PUT URL and a temp `s3_key` |
| POST | `/analyze` | Receives `{s3_key}`, runs pipeline, returns `{summaryId}` |
| GET | `/summary/{summaryId}` | Returns stored summary JSON from DynamoDB |

### PDF Parsing

`pdfplumber` extracts raw text page by page. If the resulting text is fewer than 500 characters, the backend returns HTTP 422 with message: "This lease appears to be a scanned image — we can only analyze text-based PDFs right now."

### Claude Prompt Design

Single prompt with full lease text injected. System prompt instructs Claude to return strict JSON matching this schema:

```json
{
  "intro": "string (2-4 plain-English sentences, friendly tone for first-time renters)",
  "categories": [
    {
      "name": "Auto-Renewal Clauses" | "Deposit Conditions" | "Unusual Fees" | "Missing Standard Clauses",
      "severity": "red" | "yellow" | "green",
      "findings": ["string", "..."]
    }
  ]
}
```

All four categories are always returned. If nothing concerning is found in a category, `severity` is `"green"` and `findings` contains a single reassuring string (e.g., "No auto-renewal clause found — this is normal and good.").

Claude model: `claude-sonnet-4-6` (can be overridden via env var `CLAUDE_MODEL`).

### DynamoDB Record Schema

```json
{
  "summaryId": "a3f9c12b",
  "summary": { ...Claude JSON output... },
  "createdAt": 1714176000,
  "ttl": 1721952000
}
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| PDF > 20MB | Rejected client-side before upload begins |
| Scanned/image PDF | pdfplumber returns empty text → 422 with user-friendly message |
| Claude API timeout | Lambda timeout set to 60s; client shows retry prompt after 30s |
| Claude returns malformed JSON | Retry once with stricter prompt; if still fails → 500 |
| Invalid or expired summaryId | DynamoDB miss → 404; frontend shows "This summary has expired or doesn't exist" |
| S3 delete fails | Log error, do not fail the request — summary still returned to user |

---

## Testing

- **Backend unit tests** (pytest): PDF extraction, Claude prompt construction, DynamoDB read/write with mocked boto3/anthropic clients.
- **Backend integration test:** One real end-to-end run against a sample lease PDF stored in `tests/fixtures/sample_lease.pdf`.
- **Frontend component tests** (Vitest + Testing Library): Upload flow, results rendering with fixture JSON, all error states.
- **No E2E tests for MVP.** Manual smoke test on each deploy is sufficient.

---

## Out of Scope (v1)

- OCR for scanned PDFs
- User accounts / saved lease history
- Multi-language support
- Mobile app
- Bulk upload
