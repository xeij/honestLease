# honestLease Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack web app where students upload a residential lease PDF and receive a structured, shareable analysis powered by Claude.

**Architecture:** React SPA on AWS Amplify Hosting uploads PDFs directly to S3 via a presigned URL, then calls a FastAPI Lambda (API Gateway HTTP API) that parses the PDF with pdfplumber, sends it to Claude, stores the result in DynamoDB with a 90-day TTL, and returns a shareable 8-char summary ID. The PDF is deleted from S3 immediately after analysis.

**Tech Stack:** React 18 + Vite + TypeScript + TanStack Query v5 + React Router v6 | Python 3.12 + FastAPI + Mangum + pdfplumber + anthropic SDK + boto3 | AWS SAM (Lambda + HTTP API Gateway + S3 + DynamoDB) + AWS Amplify Hosting

---

## File Structure

```
honestLease/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app + Mangum handler
│   │   ├── models.py                   # Pydantic request/response models
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── upload.py               # POST /upload
│   │   │   ├── analyze.py              # POST /analyze
│   │   │   └── summary.py              # GET /summary/{summaryId}
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── pdf_parser.py           # pdfplumber text extraction
│   │       ├── claude_client.py        # Claude API integration
│   │       ├── storage.py              # S3 presigned URL, fetch, delete
│   │       └── summary_store.py        # DynamoDB read/write
│   ├── tests/
│   │   ├── conftest.py                 # Shared moto fixtures
│   │   ├── fixtures/
│   │   │   └── generate_fixture.py     # Script to generate sample_lease.pdf
│   │   ├── test_pdf_parser.py
│   │   ├── test_claude_client.py
│   │   ├── test_storage.py
│   │   ├── test_summary_store.py
│   │   └── test_routes.py
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── types.ts                    # Shared TypeScript types
│   │   ├── api/
│   │   │   └── client.ts               # API call functions
│   │   ├── hooks/
│   │   │   └── useLeaseAnalysis.ts     # React Query mutation hook
│   │   ├── components/
│   │   │   ├── DropZone.tsx
│   │   │   ├── ProgressIndicator.tsx
│   │   │   ├── SeverityBadge.tsx
│   │   │   ├── CategoryCard.tsx
│   │   │   ├── SummaryIntro.tsx
│   │   │   ├── ShareButton.tsx
│   │   │   └── ErrorBanner.tsx
│   │   ├── pages/
│   │   │   ├── UploadPage.tsx
│   │   │   └── ResultsPage.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── src/__tests__/
│   │   ├── DropZone.test.tsx
│   │   ├── CategoryCard.test.tsx
│   │   ├── UploadPage.test.tsx
│   │   └── ResultsPage.test.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── template.yaml                       # AWS SAM template
├── amplify.yml                         # Amplify build config
├── .env.example
└── docs/
    └── superpowers/
        ├── specs/
        └── plans/
```

---

### Task 1: Initialize Project Structure

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `backend/requirements.txt`
- Create: `backend/requirements-dev.txt`

- [ ] **Step 1: Create root .gitignore**

```
# Python
__pycache__/
*.py[cod]
.venv/
.env
*.egg-info/
dist/
.pytest_cache/
.coverage

# Node
node_modules/
frontend/dist/
frontend/.env.local

# AWS
.aws-sam/
samconfig.toml

# IDE
.idea/
.vscode/
*.swp
```

Save to `.gitignore`.

- [ ] **Step 2: Create .env.example**

```
# Backend (set these in Lambda environment or locally for dev)
ANTHROPIC_API_KEY=your-key-here
AWS_REGION=us-east-1
S3_BUCKET_NAME=honestlease-pdfs-dev
DYNAMODB_TABLE_NAME=honestlease-summaries-dev
CLAUDE_MODEL=claude-sonnet-4-6
ALLOWED_ORIGINS=http://localhost:5173

# Frontend (Vite reads VITE_ prefix)
VITE_API_URL=http://localhost:8000
```

Save to `.env.example`.

- [ ] **Step 3: Create backend/requirements.txt**

```
fastapi==0.115.0
mangum==0.17.0
pdfplumber==0.11.4
anthropic==0.40.0
boto3==1.35.0
python-multipart==0.0.12
```

- [ ] **Step 4: Create backend/requirements-dev.txt**

```
pytest==8.3.3
pytest-asyncio==0.24.0
moto[s3,dynamodb]==5.0.15
httpx==0.27.2
fpdf2==2.8.1
```

- [ ] **Step 5: Create directory scaffolding**

```bash
mkdir -p backend/app/routes backend/app/services backend/tests/fixtures frontend/src/api frontend/src/hooks frontend/src/components frontend/src/pages frontend/src/__tests__
touch backend/app/__init__.py backend/app/routes/__init__.py backend/app/services/__init__.py
```

- [ ] **Step 6: Commit**

```bash
git init
git add .gitignore .env.example backend/requirements.txt backend/requirements-dev.txt
git commit -m "chore: initialize project structure"
```

---

### Task 2: Backend Models and App Entry Point

**Files:**
- Create: `backend/app/models.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: Write backend/app/models.py**

```python
from typing import Literal
from pydantic import BaseModel


class UploadResponse(BaseModel):
    presignedUrl: str
    s3Key: str


class AnalyzeRequest(BaseModel):
    s3Key: str


class AnalyzeResponse(BaseModel):
    summaryId: str


class Category(BaseModel):
    name: Literal[
        "Auto-Renewal Clauses",
        "Deposit Conditions",
        "Unusual Fees",
        "Missing Standard Clauses",
    ]
    severity: Literal["red", "yellow", "green"]
    findings: list[str]


class Summary(BaseModel):
    intro: str
    categories: list[Category]


class SummaryRecord(BaseModel):
    summaryId: str
    summary: Summary
    createdAt: int
```

- [ ] **Step 2: Write backend/app/main.py**

```python
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .routes import upload, analyze, summary

app = FastAPI(title="honestLease API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(analyze.router)
app.include_router(summary.router)

handler = Mangum(app)
```

- [ ] **Step 3: Verify the app imports cleanly**

```bash
cd backend && python -c "from app.main import app; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models.py backend/app/main.py backend/app/__init__.py backend/app/routes/__init__.py backend/app/services/__init__.py
git commit -m "feat: add FastAPI app entry point and Pydantic models"
```

---

### Task 3: PDF Parser Service

**Files:**
- Create: `backend/app/services/pdf_parser.py`
- Create: `backend/tests/fixtures/generate_fixture.py`
- Create: `backend/tests/test_pdf_parser.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_pdf_parser.py
import io
import pytest
from app.services.pdf_parser import extract_text, validate_text


def _make_pdf(text: str) -> bytes:
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    pdf.multi_cell(0, 6, text)
    return bytes(pdf.output())


def test_extract_text_returns_text_from_valid_pdf():
    pdf_bytes = _make_pdf("This is a sample lease agreement with enough content.")
    result = extract_text(pdf_bytes)
    assert "lease" in result.lower()


def test_extract_text_returns_string():
    pdf_bytes = _make_pdf("Hello world")
    assert isinstance(extract_text(pdf_bytes), str)


def test_validate_text_passes_on_sufficient_text():
    long_text = "x" * 600
    validate_text(long_text)  # should not raise


def test_validate_text_raises_on_short_text():
    with pytest.raises(ValueError, match="scanned image"):
        validate_text("too short")
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_pdf_parser.py -v
```

Expected: 4 errors — `app.services.pdf_parser` not found.

- [ ] **Step 3: Write backend/app/services/pdf_parser.py**

```python
import io
import pdfplumber

MIN_CHARS = 500


def extract_text(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n\n".join(pages).strip()


def validate_text(text: str) -> None:
    if len(text) < MIN_CHARS:
        raise ValueError(
            "This lease appears to be a scanned image — "
            "we can only analyze text-based PDFs right now."
        )
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && python -m pytest tests/test_pdf_parser.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Generate the test fixture PDF**

```python
# backend/tests/fixtures/generate_fixture.py
from fpdf import FPDF

LEASE_TEXT = """RESIDENTIAL LEASE AGREEMENT

This Residential Lease Agreement is entered into as of January 1, 2025, between
Landlord: John Smith, and Tenant: Jane Doe.

PROPERTY: 123 Main Street, Apt 4B, New York, NY 10001.

TERM: This lease commences February 1, 2025 and expires January 31, 2026.

AUTO-RENEWAL: This lease automatically renews for successive one-year terms unless
either party provides written notice of non-renewal at least 60 days prior to the
expiration date. Failure to provide notice results in binding renewal.

RENT: Monthly rent is $2,000, due on the first of each month. A late fee of $150
applies after 5 days. Returned check fee: $50. Administrative fee: $25/month.

SECURITY DEPOSIT: Tenant shall deposit $4,000. Landlord may deduct for damages
beyond normal wear and tear, unpaid rent, and cleaning. Return within 30 days of
move-out, minus documented deductions. No interest on deposit.

UTILITIES: Tenant is responsible for electricity, gas, and internet. Landlord
covers water and trash collection.

MAINTENANCE: Tenant is responsible for all repairs under $100. Tenant must
report issues within 24 hours or forfeit right to repair claims.

PARKING: One parking space included. Additional spaces available at $150/month.

EARLY TERMINATION: Tenant may terminate with 60 days written notice and payment
of two months rent as a termination fee.

SUBLETTING: No subletting permitted without prior written consent of landlord.
Consent may be withheld at landlord sole discretion.

PETS: No pets without written consent and a non-refundable pet fee of $500.

ENTRY: Landlord may enter premises with 24-hour notice for inspections, repairs,
or showing to prospective tenants.

GOVERNING LAW: This agreement is governed by the laws of the State of New York.

ENTIRE AGREEMENT: This lease constitutes the entire agreement between the parties.
"""


def generate():
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    for line in LEASE_TEXT.split("\n"):
        pdf.multi_cell(0, 6, line)
    pdf.output("backend/tests/fixtures/sample_lease.pdf")
    print("Generated backend/tests/fixtures/sample_lease.pdf")


if __name__ == "__main__":
    generate()
```

Run it:

```bash
cd backend && pip install fpdf2 && python tests/fixtures/generate_fixture.py
```

Expected: `Generated backend/tests/fixtures/sample_lease.pdf`

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/pdf_parser.py backend/tests/test_pdf_parser.py backend/tests/fixtures/generate_fixture.py backend/tests/fixtures/sample_lease.pdf
git commit -m "feat: add PDF parser service with tests and fixture"
```

---

### Task 4: S3 Storage Service

**Files:**
- Create: `backend/app/services/storage.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_storage.py`

- [ ] **Step 1: Write backend/tests/conftest.py**

```python
import os
import pytest
import boto3
from moto import mock_aws

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SECURITY_TOKEN", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("S3_BUCKET_NAME", "test-lease-bucket")
os.environ.setdefault("DYNAMODB_TABLE_NAME", "test-summaries")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("CLAUDE_MODEL", "claude-sonnet-4-6")


@pytest.fixture
def s3_bucket():
    with mock_aws():
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="test-lease-bucket")
        yield s3


@pytest.fixture
def dynamodb_table():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-summaries",
            KeySchema=[{"AttributeName": "summaryId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "summaryId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
            TimeToLiveSpecification={"AttributeName": "ttl", "Enabled": True},
        )
        yield table
```

- [ ] **Step 2: Write the failing tests**

```python
# backend/tests/test_storage.py
import boto3
import pytest
from moto import mock_aws
from app.services.storage import generate_upload_url, fetch_pdf, delete_pdf


@mock_aws
def test_generate_upload_url_returns_presigned_url_and_key(s3_bucket):
    url, key = generate_upload_url()
    assert url.startswith("https://")
    assert key.startswith("leases/")
    assert key.endswith(".pdf")


@mock_aws
def test_fetch_pdf_returns_bytes(s3_bucket):
    s3_bucket.put_object(Bucket="test-lease-bucket", Key="leases/test.pdf", Body=b"PDF content")
    result = fetch_pdf("leases/test.pdf")
    assert result == b"PDF content"


@mock_aws
def test_delete_pdf_removes_object(s3_bucket):
    s3_bucket.put_object(Bucket="test-lease-bucket", Key="leases/del.pdf", Body=b"data")
    delete_pdf("leases/del.pdf")
    objects = s3_bucket.list_objects_v2(Bucket="test-lease-bucket").get("Contents", [])
    assert not any(o["Key"] == "leases/del.pdf" for o in objects)


@mock_aws
def test_delete_pdf_does_not_raise_on_missing_object(s3_bucket):
    delete_pdf("leases/nonexistent.pdf")  # should not raise
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_storage.py -v
```

Expected: 4 errors — `app.services.storage` not found.

- [ ] **Step 4: Write backend/app/services/storage.py**

```python
import logging
import os
import uuid

import boto3

logger = logging.getLogger(__name__)


def _s3():
    return boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))


def _bucket() -> str:
    return os.getenv("S3_BUCKET_NAME", "")


def generate_upload_url() -> tuple[str, str]:
    s3_key = f"leases/{uuid.uuid4()}.pdf"
    url = _s3().generate_presigned_url(
        "put_object",
        Params={"Bucket": _bucket(), "Key": s3_key, "ContentType": "application/pdf"},
        ExpiresIn=300,
    )
    return url, s3_key


def fetch_pdf(s3_key: str) -> bytes:
    response = _s3().get_object(Bucket=_bucket(), Key=s3_key)
    return response["Body"].read()


def delete_pdf(s3_key: str) -> None:
    try:
        _s3().delete_object(Bucket=_bucket(), Key=s3_key)
    except Exception:
        logger.exception("Failed to delete %s from S3 — continuing", s3_key)
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd backend && python -m pytest tests/test_storage.py -v
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/storage.py backend/tests/conftest.py backend/tests/test_storage.py
git commit -m "feat: add S3 storage service with tests"
```

---

### Task 5: DynamoDB Summary Store

**Files:**
- Create: `backend/app/services/summary_store.py`
- Create: `backend/tests/test_summary_store.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_summary_store.py
import time
import pytest
from moto import mock_aws
from app.services.summary_store import save_summary, get_summary, generate_summary_id

SAMPLE_SUMMARY = {
    "intro": "Your lease has a few things to watch out for.",
    "categories": [
        {"name": "Auto-Renewal Clauses", "severity": "red", "findings": ["Auto-renews 60 days before expiry."]}
    ],
}


def test_generate_summary_id_is_8_chars():
    sid = generate_summary_id()
    assert len(sid) == 8
    assert sid.isalnum()


@mock_aws
def test_save_summary_returns_8_char_id(dynamodb_table):
    sid = save_summary(SAMPLE_SUMMARY)
    assert len(sid) == 8


@mock_aws
def test_save_summary_stores_item_with_ttl(dynamodb_table):
    before = int(time.time())
    sid = save_summary(SAMPLE_SUMMARY)
    item = dynamodb_table.get_item(Key={"summaryId": sid})["Item"]
    assert item["summaryId"] == sid
    assert item["summary"] == SAMPLE_SUMMARY
    assert item["createdAt"] >= before
    assert item["ttl"] > item["createdAt"]


@mock_aws
def test_get_summary_returns_stored_item(dynamodb_table):
    sid = save_summary(SAMPLE_SUMMARY)
    result = get_summary(sid)
    assert result is not None
    assert result["summaryId"] == sid
    assert result["summary"] == SAMPLE_SUMMARY


@mock_aws
def test_get_summary_returns_none_for_unknown_id(dynamodb_table):
    result = get_summary("00000000")
    assert result is None
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_summary_store.py -v
```

Expected: 5 errors — `app.services.summary_store` not found.

- [ ] **Step 3: Write backend/app/services/summary_store.py**

```python
import os
import time
import uuid

import boto3

TTL_DAYS = 90


def _table():
    dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "us-east-1"))
    return dynamodb.Table(os.getenv("DYNAMODB_TABLE_NAME", ""))


def generate_summary_id() -> str:
    return uuid.uuid4().hex[:8]


def save_summary(summary: dict) -> str:
    summary_id = generate_summary_id()
    created_at = int(time.time())
    _table().put_item(
        Item={
            "summaryId": summary_id,
            "summary": summary,
            "createdAt": created_at,
            "ttl": created_at + TTL_DAYS * 86400,
        }
    )
    return summary_id


def get_summary(summary_id: str) -> dict | None:
    response = _table().get_item(Key={"summaryId": summary_id})
    return response.get("Item")
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && python -m pytest tests/test_summary_store.py -v
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/summary_store.py backend/tests/test_summary_store.py
git commit -m "feat: add DynamoDB summary store with tests"
```

---

### Task 6: Claude Client Service

**Files:**
- Create: `backend/app/services/claude_client.py`
- Create: `backend/tests/test_claude_client.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_claude_client.py
import json
from unittest.mock import MagicMock, patch
import pytest
from app.services.claude_client import analyze_lease

VALID_RESPONSE = {
    "intro": "This lease looks mostly standard with one concern.",
    "categories": [
        {"name": "Auto-Renewal Clauses", "severity": "red", "findings": ["Auto-renews without notice."]},
        {"name": "Deposit Conditions", "severity": "green", "findings": ["No issues found — this looks normal."]},
        {"name": "Unusual Fees", "severity": "yellow", "findings": ["$25/month admin fee is uncommon."]},
        {"name": "Missing Standard Clauses", "severity": "green", "findings": ["No issues found — this looks normal."]},
    ],
}


def _mock_claude(response_text: str):
    mock_msg = MagicMock()
    mock_msg.content = [MagicMock(text=response_text)]
    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_msg
    return mock_client


def test_analyze_lease_returns_parsed_dict():
    with patch("app.services.claude_client.anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value = _mock_claude(json.dumps(VALID_RESPONSE))
        result = analyze_lease("Sample lease text " * 50)
    assert result["intro"] == VALID_RESPONSE["intro"]
    assert len(result["categories"]) == 4


def test_analyze_lease_retries_on_malformed_json():
    valid_json = json.dumps(VALID_RESPONSE)
    call_count = 0

    def side_effect(**kwargs):
        nonlocal call_count
        call_count += 1
        text = "not json" if call_count == 1 else valid_json
        msg = MagicMock()
        msg.content = [MagicMock(text=text)]
        return msg

    with patch("app.services.claude_client.anthropic.Anthropic") as MockAnthropic:
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = side_effect
        MockAnthropic.return_value = mock_client
        result = analyze_lease("Sample lease text " * 50)

    assert call_count == 2
    assert result["intro"] == VALID_RESPONSE["intro"]


def test_analyze_lease_raises_after_two_malformed_responses():
    with patch("app.services.claude_client.anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value = _mock_claude("not valid json at all")
        with pytest.raises(ValueError, match="invalid JSON"):
            analyze_lease("Sample lease text " * 50)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_claude_client.py -v
```

Expected: 3 errors — `app.services.claude_client` not found.

- [ ] **Step 3: Write backend/app/services/claude_client.py**

```python
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && python -m pytest tests/test_claude_client.py -v
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/claude_client.py backend/tests/test_claude_client.py
git commit -m "feat: add Claude client service with retry logic and tests"
```

---

### Task 7: Upload Route

**Files:**
- Create: `backend/app/routes/upload.py`
- Create: `backend/tests/test_routes.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_routes.py
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from moto import mock_aws
import pytest

from app.main import app

client = TestClient(app)


@mock_aws
def test_post_upload_returns_presigned_url_and_key(s3_bucket):
    response = client.post("/upload")
    assert response.status_code == 200
    data = response.json()
    assert "presignedUrl" in data
    assert data["presignedUrl"].startswith("https://")
    assert data["s3Key"].startswith("leases/")
    assert data["s3Key"].endswith(".pdf")
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && python -m pytest tests/test_routes.py::test_post_upload_returns_presigned_url_and_key -v
```

Expected: FAIL — 404 Not Found.

- [ ] **Step 3: Write backend/app/routes/upload.py**

```python
from fastapi import APIRouter
from ..models import UploadResponse
from ..services.storage import generate_upload_url

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
def upload():
    presigned_url, s3_key = generate_upload_url()
    return UploadResponse(presignedUrl=presigned_url, s3Key=s3_key)
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd backend && python -m pytest tests/test_routes.py::test_post_upload_returns_presigned_url_and_key -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/upload.py backend/tests/test_routes.py
git commit -m "feat: add POST /upload route"
```

---

### Task 8: Analyze Route

**Files:**
- Modify: `backend/app/routes/analyze.py` (create)
- Modify: `backend/tests/test_routes.py`

- [ ] **Step 1: Add failing tests to test_routes.py**

Append these tests to `backend/tests/test_routes.py`:

```python
import json


SAMPLE_CLAUDE_RESPONSE = {
    "intro": "Overall this lease is standard.",
    "categories": [
        {"name": "Auto-Renewal Clauses", "severity": "green", "findings": ["No issues found — this looks normal."]},
        {"name": "Deposit Conditions", "severity": "green", "findings": ["No issues found — this looks normal."]},
        {"name": "Unusual Fees", "severity": "green", "findings": ["No issues found — this looks normal."]},
        {"name": "Missing Standard Clauses", "severity": "green", "findings": ["No issues found — this looks normal."]},
    ],
}


@mock_aws
def test_post_analyze_returns_summary_id(s3_bucket, dynamodb_table):
    sample_pdf = open("tests/fixtures/sample_lease.pdf", "rb").read()
    s3_bucket.put_object(Bucket="test-lease-bucket", Key="leases/test.pdf", Body=sample_pdf)

    mock_msg = MagicMock()
    mock_msg.content = [MagicMock(text=json.dumps(SAMPLE_CLAUDE_RESPONSE))]

    with patch("app.services.claude_client.anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = mock_msg
        response = client.post("/analyze", json={"s3Key": "leases/test.pdf"})

    assert response.status_code == 200
    data = response.json()
    assert "summaryId" in data
    assert len(data["summaryId"]) == 8


@mock_aws
def test_post_analyze_returns_422_for_scanned_pdf(s3_bucket, dynamodb_table):
    # A PDF with fewer than 500 chars of text (empty body simulates image-only PDF)
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 10, "Hi")  # only 2 chars
    tiny_pdf = bytes(pdf.output())
    s3_bucket.put_object(Bucket="test-lease-bucket", Key="leases/tiny.pdf", Body=tiny_pdf)

    response = client.post("/analyze", json={"s3Key": "leases/tiny.pdf"})
    assert response.status_code == 422
    assert "scanned image" in response.json()["detail"]
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_routes.py::test_post_analyze_returns_summary_id tests/test_routes.py::test_post_analyze_returns_422_for_scanned_pdf -v
```

Expected: FAIL — 404 Not Found.

- [ ] **Step 3: Write backend/app/routes/analyze.py**

```python
from fastapi import APIRouter, HTTPException
from ..models import AnalyzeRequest, AnalyzeResponse
from ..services import storage, pdf_parser, claude_client, summary_store

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    pdf_bytes = storage.fetch_pdf(request.s3Key)

    text = pdf_parser.extract_text(pdf_bytes)
    try:
        pdf_parser.validate_text(text)
    except ValueError as e:
        storage.delete_pdf(request.s3Key)
        raise HTTPException(status_code=422, detail=str(e))

    summary = claude_client.analyze_lease(text)
    summary_id = summary_store.save_summary(summary)
    storage.delete_pdf(request.s3Key)

    return AnalyzeResponse(summaryId=summary_id)
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && python -m pytest tests/test_routes.py::test_post_analyze_returns_summary_id tests/test_routes.py::test_post_analyze_returns_422_for_scanned_pdf -v
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/analyze.py backend/tests/test_routes.py
git commit -m "feat: add POST /analyze route with pipeline orchestration"
```

---

### Task 9: Summary GET Route

**Files:**
- Create: `backend/app/routes/summary.py`
- Modify: `backend/tests/test_routes.py`

- [ ] **Step 1: Add failing tests to test_routes.py**

Append to `backend/tests/test_routes.py`:

```python
@mock_aws
def test_get_summary_returns_stored_summary(dynamodb_table):
    from app.services.summary_store import save_summary
    summary_id = save_summary(SAMPLE_CLAUDE_RESPONSE)

    response = client.get(f"/summary/{summary_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["summaryId"] == summary_id
    assert data["summary"]["intro"] == SAMPLE_CLAUDE_RESPONSE["intro"]
    assert len(data["summary"]["categories"]) == 4


@mock_aws
def test_get_summary_returns_404_for_unknown_id(dynamodb_table):
    response = client.get("/summary/00000000")
    assert response.status_code == 404
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_routes.py::test_get_summary_returns_stored_summary tests/test_routes.py::test_get_summary_returns_404_for_unknown_id -v
```

Expected: FAIL — 404 Not Found (route missing).

- [ ] **Step 3: Write backend/app/routes/summary.py**

```python
from fastapi import APIRouter, HTTPException
from ..models import SummaryRecord, Summary
from ..services.summary_store import get_summary

router = APIRouter()


@router.get("/summary/{summary_id}", response_model=SummaryRecord)
def get(summary_id: str):
    item = get_summary(summary_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Summary not found or has expired.")
    return SummaryRecord(
        summaryId=item["summaryId"],
        summary=Summary(**item["summary"]),
        createdAt=item["createdAt"],
    )
```

- [ ] **Step 4: Run all backend tests to confirm everything passes**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/summary.py backend/tests/test_routes.py
git commit -m "feat: add GET /summary/{id} route — backend complete"
```

---

### Task 10: Frontend Scaffold

**Files:**
- Create: `frontend/` (Vite project)
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`

- [ ] **Step 1: Scaffold the Vite React TypeScript project**

```bash
cd /home/xeij/Desktop/everything/honestLease
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install @tanstack/react-query react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

- [ ] **Step 3: Update vite.config.ts to add test config**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/__tests__/setup.ts",
  },
});
```

- [ ] **Step 4: Create src/__tests__/setup.ts**

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Replace tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Verify tests run**

```bash
cd frontend && npx vitest run
```

Expected: No tests found, but exits 0 (no failures).

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/
git commit -m "chore: scaffold frontend with Vite, React, TypeScript, Vitest"
```

---

### Task 11: TypeScript Types and API Client

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: Write frontend/src/types.ts**

```typescript
export type Severity = "red" | "yellow" | "green";

export type CategoryName =
  | "Auto-Renewal Clauses"
  | "Deposit Conditions"
  | "Unusual Fees"
  | "Missing Standard Clauses";

export interface Category {
  name: CategoryName;
  severity: Severity;
  findings: string[];
}

export interface Summary {
  intro: string;
  categories: Category[];
}

export interface SummaryRecord {
  summaryId: string;
  summary: Summary;
  createdAt: number;
}

export interface UploadUrlResponse {
  presignedUrl: string;
  s3Key: string;
}

export interface AnalyzeResponse {
  summaryId: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
```

- [ ] **Step 2: Write frontend/src/api/client.ts**

```typescript
import type { UploadUrlResponse, AnalyzeResponse, SummaryRecord } from "../types";
import { ApiError } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(res.status, body.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export async function getUploadUrl(): Promise<UploadUrlResponse> {
  const res = await fetch(`${API_URL}/upload`, { method: "POST" });
  return handleResponse<UploadUrlResponse>(res);
}

export async function uploadPdfToS3(presignedUrl: string, file: File): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": "application/pdf" },
  });
  if (!res.ok) throw new ApiError(res.status, "Failed to upload file to storage");
}

export async function analyzeLease(s3Key: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ s3Key }),
  });
  return handleResponse<AnalyzeResponse>(res);
}

export async function getSummary(summaryId: string): Promise<SummaryRecord> {
  const res = await fetch(`${API_URL}/summary/${summaryId}`);
  return handleResponse<SummaryRecord>(res);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/client.ts
git commit -m "feat: add TypeScript types and API client"
```

---

### Task 12: useLeaseAnalysis Hook

**Files:**
- Create: `frontend/src/hooks/useLeaseAnalysis.ts`

- [ ] **Step 1: Write frontend/src/hooks/useLeaseAnalysis.ts**

```typescript
import { useState } from "react";
import { getUploadUrl, uploadPdfToS3, analyzeLease } from "../api/client";
import { ApiError } from "../types";

export type AnalysisPhase = "idle" | "uploading" | "analyzing" | "done" | "error";

export interface UseLeaseAnalysisResult {
  phase: AnalysisPhase;
  summaryId: string | null;
  errorMessage: string | null;
  run: (file: File) => Promise<void>;
  reset: () => void;
}

export function useLeaseAnalysis(): UseLeaseAnalysisResult {
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function run(file: File) {
    setPhase("uploading");
    setErrorMessage(null);
    try {
      const { presignedUrl, s3Key } = await getUploadUrl();
      await uploadPdfToS3(presignedUrl, file);
      setPhase("analyzing");
      const { summaryId: id } = await analyzeLease(s3Key);
      setSummaryId(id);
      setPhase("done");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setErrorMessage(message);
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setSummaryId(null);
    setErrorMessage(null);
  }

  return { phase, summaryId, errorMessage, run, reset };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useLeaseAnalysis.ts
git commit -m "feat: add useLeaseAnalysis hook"
```

---

### Task 13: DropZone Component

**Files:**
- Create: `frontend/src/components/DropZone.tsx`
- Create: `frontend/src/__tests__/DropZone.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/DropZone.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropZone } from "../components/DropZone";

const PDF_FILE = new File(["content"], "lease.pdf", { type: "application/pdf" });
const LARGE_FILE = new File([new ArrayBuffer(21 * 1024 * 1024)], "big.pdf", {
  type: "application/pdf",
});

test("renders upload prompt", () => {
  render(<DropZone onFile={() => {}} />);
  expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
});

test("calls onFile when valid PDF selected", async () => {
  const onFile = vi.fn();
  render(<DropZone onFile={onFile} />);
  const input = screen.getByTestId("file-input");
  await userEvent.upload(input, PDF_FILE);
  expect(onFile).toHaveBeenCalledWith(PDF_FILE);
});

test("shows error when file is not a PDF", async () => {
  render(<DropZone onFile={() => {}} />);
  const nonPdf = new File(["x"], "doc.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const input = screen.getByTestId("file-input");
  await userEvent.upload(input, nonPdf);
  expect(screen.getByText(/pdf/i)).toBeInTheDocument();
});

test("shows error when file exceeds 20MB", async () => {
  render(<DropZone onFile={() => {}} />);
  const input = screen.getByTestId("file-input");
  await userEvent.upload(input, LARGE_FILE);
  expect(screen.getByText(/20mb/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npx vitest run src/__tests__/DropZone.test.tsx
```

Expected: FAIL — `DropZone` not found.

- [ ] **Step 3: Write frontend/src/components/DropZone.tsx**

```typescript
import { useRef, useState, DragEvent, ChangeEvent } from "react";

const MAX_BYTES = 20 * 1024 * 1024;

interface Props {
  onFile: (file: File) => void;
}

export function DropZone({ onFile }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (file.type !== "application/pdf") return "Please upload a PDF file.";
    if (file.size > MAX_BYTES) return "File must be under 20MB.";
    return null;
  }

  function handleFile(file: File) {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null);
    onFile(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "#3b82f6" : "#d1d5db"}`,
        borderRadius: 8,
        padding: "2rem",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "#eff6ff" : "#f9fafb",
      }}
    >
      <p>Drag &amp; drop your lease PDF here, or click to select</p>
      <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>PDF only · max 20MB</p>
      {error && <p style={{ color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={onChange}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/__tests__/DropZone.test.tsx
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DropZone.tsx frontend/src/__tests__/DropZone.test.tsx
git commit -m "feat: add DropZone component with validation"
```

---

### Task 14: ProgressIndicator and ErrorBanner Components

**Files:**
- Create: `frontend/src/components/ProgressIndicator.tsx`
- Create: `frontend/src/components/ErrorBanner.tsx`

- [ ] **Step 1: Write frontend/src/components/ProgressIndicator.tsx**

```typescript
import type { AnalysisPhase } from "../hooks/useLeaseAnalysis";

const LABELS: Partial<Record<AnalysisPhase, string>> = {
  uploading: "Uploading your lease...",
  analyzing: "Analyzing your lease — this takes about 20 seconds...",
};

interface Props {
  phase: AnalysisPhase;
}

export function ProgressIndicator({ phase }: Props) {
  const label = LABELS[phase];
  if (!label) return null;
  return (
    <div style={{ textAlign: "center", padding: "1rem", color: "#374151" }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #e5e7eb",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 0.75rem",
        }}
      />
      <p>{label}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
```

- [ ] **Step 2: Write frontend/src/components/ErrorBanner.tsx**

```typescript
interface Props {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div
      role="alert"
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 6,
        padding: "0.75rem 1rem",
        color: "#b91c1c",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "0.5rem",
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss error"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", fontWeight: 700 }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProgressIndicator.tsx frontend/src/components/ErrorBanner.tsx
git commit -m "feat: add ProgressIndicator and ErrorBanner components"
```

---

### Task 15: SeverityBadge and CategoryCard Components

**Files:**
- Create: `frontend/src/components/SeverityBadge.tsx`
- Create: `frontend/src/components/CategoryCard.tsx`
- Create: `frontend/src/__tests__/CategoryCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/CategoryCard.test.tsx
import { render, screen } from "@testing-library/react";
import { CategoryCard } from "../components/CategoryCard";
import type { Category } from "../types";

const RED_CATEGORY: Category = {
  name: "Auto-Renewal Clauses",
  severity: "red",
  findings: ["Auto-renews 60 days before expiry.", "Requires written notice to opt out."],
};

const GREEN_CATEGORY: Category = {
  name: "Deposit Conditions",
  severity: "green",
  findings: ["No issues found — this looks normal."],
};

test("renders category name and findings", () => {
  render(<CategoryCard category={RED_CATEGORY} />);
  expect(screen.getByText("Auto-Renewal Clauses")).toBeInTheDocument();
  expect(screen.getByText("Auto-renews 60 days before expiry.")).toBeInTheDocument();
});

test("renders red severity badge with 'Watch out' label", () => {
  render(<CategoryCard category={RED_CATEGORY} />);
  expect(screen.getByText(/watch out/i)).toBeInTheDocument();
});

test("renders green severity badge with 'Looks normal' label", () => {
  render(<CategoryCard category={GREEN_CATEGORY} />);
  expect(screen.getByText(/looks normal/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npx vitest run src/__tests__/CategoryCard.test.tsx
```

Expected: FAIL — `CategoryCard` not found.

- [ ] **Step 3: Write frontend/src/components/SeverityBadge.tsx**

```typescript
import type { Severity } from "../types";

const CONFIG: Record<Severity, { label: string; bg: string; color: string }> = {
  red:    { label: "Watch out",       bg: "#fef2f2", color: "#b91c1c" },
  yellow: { label: "Worth asking",    bg: "#fffbeb", color: "#b45309" },
  green:  { label: "Looks normal",    bg: "#f0fdf4", color: "#15803d" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { label, bg, color } = CONFIG[severity];
  return (
    <span style={{ background: bg, color, borderRadius: 999, padding: "2px 10px", fontSize: "0.8rem", fontWeight: 600 }}>
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Write frontend/src/components/CategoryCard.tsx**

```typescript
import type { Category } from "../types";
import { SeverityBadge } from "./SeverityBadge";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "1rem 1.25rem", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{category.name}</h3>
        <SeverityBadge severity={category.severity} />
      </div>
      <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {category.findings.map((f, i) => (
          <li key={i} style={{ color: "#374151", lineHeight: 1.6 }}>{f}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/__tests__/CategoryCard.test.tsx
```

Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/SeverityBadge.tsx frontend/src/components/CategoryCard.tsx frontend/src/__tests__/CategoryCard.test.tsx
git commit -m "feat: add SeverityBadge and CategoryCard components"
```

---

### Task 16: SummaryIntro and ShareButton Components

**Files:**
- Create: `frontend/src/components/SummaryIntro.tsx`
- Create: `frontend/src/components/ShareButton.tsx`

- [ ] **Step 1: Write frontend/src/components/SummaryIntro.tsx**

```typescript
export function SummaryIntro({ intro }: { intro: string }) {
  return (
    <div style={{ background: "#eff6ff", borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
      <p style={{ margin: 0, color: "#1e40af", lineHeight: 1.7 }}>{intro}</p>
    </div>
  );
}
```

- [ ] **Step 2: Write frontend/src/components/ShareButton.tsx**

```typescript
import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      style={{
        background: copied ? "#16a34a" : "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "0.6rem 1.25rem",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.9rem",
        transition: "background 0.15s",
      }}
    >
      {copied ? "Link copied!" : "Copy shareable link"}
    </button>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/SummaryIntro.tsx frontend/src/components/ShareButton.tsx
git commit -m "feat: add SummaryIntro and ShareButton components"
```

---

### Task 17: UploadPage

**Files:**
- Create: `frontend/src/pages/UploadPage.tsx`
- Create: `frontend/src/__tests__/UploadPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/UploadPage.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { UploadPage } from "../pages/UploadPage";
import * as apiClient from "../api/client";

vi.mock("../api/client");

const PDF_FILE = new File(["content"], "lease.pdf", { type: "application/pdf" });

function renderPage() {
  return render(<MemoryRouter><UploadPage /></MemoryRouter>);
}

test("renders the upload heading", () => {
  renderPage();
  expect(screen.getByText(/honestlease/i)).toBeInTheDocument();
});

test("analyze button is disabled before file is selected", () => {
  renderPage();
  expect(screen.getByRole("button", { name: /analyze/i })).toBeDisabled();
});

test("analyze button enables after valid PDF is selected", async () => {
  renderPage();
  await userEvent.upload(screen.getByTestId("file-input"), PDF_FILE);
  expect(screen.getByRole("button", { name: /analyze/i })).toBeEnabled();
});

test("shows uploading state when analysis starts", async () => {
  vi.mocked(apiClient.getUploadUrl).mockResolvedValue({ presignedUrl: "http://s3", s3Key: "leases/x.pdf" });
  vi.mocked(apiClient.uploadPdfToS3).mockResolvedValue(undefined);
  vi.mocked(apiClient.analyzeLease).mockImplementation(() => new Promise(() => {})); // never resolves

  renderPage();
  await userEvent.upload(screen.getByTestId("file-input"), PDF_FILE);
  await userEvent.click(screen.getByRole("button", { name: /analyze/i }));
  expect(await screen.findByText(/uploading/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npx vitest run src/__tests__/UploadPage.test.tsx
```

Expected: FAIL — `UploadPage` not found.

- [ ] **Step 3: Write frontend/src/pages/UploadPage.tsx**

```typescript
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DropZone } from "../components/DropZone";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { ErrorBanner } from "../components/ErrorBanner";
import { useLeaseAnalysis } from "../hooks/useLeaseAnalysis";
import { useState } from "react";

export function UploadPage() {
  const navigate = useNavigate();
  const { phase, summaryId, errorMessage, run, reset } = useLeaseAnalysis();
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (phase === "done" && summaryId) {
      navigate(`/summary/${summaryId}`);
    }
  }, [phase, summaryId, navigate]);

  const isRunning = phase === "uploading" || phase === "analyzing";

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>honestLease</h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
        Upload your residential lease and get a plain-English summary of the things that matter:
        auto-renewal traps, deposit conditions, unusual fees, and what's missing.
      </p>

      {errorMessage && (
        <div style={{ marginBottom: "1rem" }}>
          <ErrorBanner message={errorMessage} onDismiss={reset} />
        </div>
      )}

      {!isRunning && (
        <>
          <DropZone onFile={setFile} />
          <button
            onClick={() => file && run(file)}
            disabled={!file}
            style={{
              marginTop: "1rem",
              width: "100%",
              padding: "0.75rem",
              background: file ? "#3b82f6" : "#e5e7eb",
              color: file ? "#fff" : "#9ca3af",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: "1rem",
              cursor: file ? "pointer" : "not-allowed",
            }}
          >
            Analyze my lease
          </button>
        </>
      )}

      <ProgressIndicator phase={phase} />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/__tests__/UploadPage.test.tsx
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/UploadPage.tsx frontend/src/__tests__/UploadPage.test.tsx
git commit -m "feat: add UploadPage"
```

---

### Task 18: ResultsPage and App Router

**Files:**
- Create: `frontend/src/pages/ResultsPage.tsx`
- Create: `frontend/src/__tests__/ResultsPage.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/ResultsPage.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { ResultsPage } from "../pages/ResultsPage";
import * as apiClient from "../api/client";
import type { SummaryRecord } from "../types";

vi.mock("../api/client");

const RECORD: SummaryRecord = {
  summaryId: "abc12345",
  createdAt: 1714176000,
  summary: {
    intro: "Your lease looks mostly fine with one thing to watch.",
    categories: [
      { name: "Auto-Renewal Clauses", severity: "red", findings: ["Auto-renews without notice."] },
      { name: "Deposit Conditions", severity: "green", findings: ["No issues found — this looks normal."] },
      { name: "Unusual Fees", severity: "yellow", findings: ["$25/month admin fee is uncommon."] },
      { name: "Missing Standard Clauses", severity: "green", findings: ["No issues found — this looks normal."] },
    ],
  },
};

function renderPage(summaryId = "abc12345") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/summary/${summaryId}`]}>
        <Routes>
          <Route path="/summary/:id" element={<ResultsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

test("renders intro paragraph when loaded", async () => {
  vi.mocked(apiClient.getSummary).mockResolvedValue(RECORD);
  renderPage();
  expect(await screen.findByText(RECORD.summary.intro)).toBeInTheDocument();
});

test("renders all four category cards", async () => {
  vi.mocked(apiClient.getSummary).mockResolvedValue(RECORD);
  renderPage();
  await screen.findByText(RECORD.summary.intro);
  expect(screen.getByText("Auto-Renewal Clauses")).toBeInTheDocument();
  expect(screen.getByText("Deposit Conditions")).toBeInTheDocument();
  expect(screen.getByText("Unusual Fees")).toBeInTheDocument();
  expect(screen.getByText("Missing Standard Clauses")).toBeInTheDocument();
});

test("shows expired message on 404", async () => {
  vi.mocked(apiClient.getSummary).mockRejectedValue(
    Object.assign(new Error("Summary not found or has expired."), { status: 404 })
  );
  renderPage("00000000");
  expect(await screen.findByText(/expired/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npx vitest run src/__tests__/ResultsPage.test.tsx
```

Expected: FAIL — `ResultsPage` not found.

- [ ] **Step 3: Write frontend/src/pages/ResultsPage.tsx**

```typescript
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSummary } from "../api/client";
import { CategoryCard } from "../components/CategoryCard";
import { SummaryIntro } from "../components/SummaryIntro";
import { ShareButton } from "../components/ShareButton";
import { ErrorBanner } from "../components/ErrorBanner";

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["summary", id],
    queryFn: () => getSummary(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "4rem", fontFamily: "system-ui, sans-serif" }}>Loading summary...</div>;
  }

  if (error) {
    const msg =
      error instanceof Error && error.message.includes("expired")
        ? "This summary has expired or doesn't exist. Summaries are kept for 90 days."
        : "Failed to load summary. Please try again.";
    return (
      <div style={{ maxWidth: 560, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif" }}>
        <ErrorBanner message={msg} />
        <Link to="/" style={{ display: "block", marginTop: "1rem", color: "#3b82f6" }}>
          Analyze another lease
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem" }}>Your Lease Summary</h1>
      <SummaryIntro intro={data.summary.intro} />
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
        {data.summary.categories.map((cat) => (
          <CategoryCard key={cat.name} category={cat} />
        ))}
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <ShareButton />
        <Link
          to="/"
          style={{
            padding: "0.6rem 1.25rem",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            color: "#374151",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Analyze another lease
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write frontend/src/App.tsx**

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UploadPage } from "./pages/UploadPage";
import { ResultsPage } from "./pages/ResultsPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/summary/:id" element={<ResultsPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Write frontend/src/main.tsx**

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 6: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ResultsPage.tsx frontend/src/__tests__/ResultsPage.test.tsx frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: add ResultsPage and App router — frontend complete"
```

---

### Task 19: AWS SAM Infrastructure Template

**Files:**
- Create: `template.yaml`

- [ ] **Step 1: Write template.yaml**

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Description: honestLease — PDF lease analyzer

Parameters:
  AnthropicApiKey:
    Type: String
    NoEcho: true
    Description: Anthropic API key for Claude
  AllowedOrigins:
    Type: String
    Default: "*"
    Description: Comma-separated list of allowed CORS origins

Globals:
  Function:
    Runtime: python3.12
    Timeout: 60
    MemorySize: 512
    Environment:
      Variables:
        S3_BUCKET_NAME: !Ref LeasePdfBucket
        DYNAMODB_TABLE_NAME: !Ref SummariesTable
        ANTHROPIC_API_KEY: !Ref AnthropicApiKey
        CLAUDE_MODEL: claude-sonnet-4-6
        AWS_REGION: !Ref AWS::Region
        ALLOWED_ORIGINS: !Ref AllowedOrigins

Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: backend/
      Handler: app.main.handler
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref LeasePdfBucket
        - DynamoDBCrudPolicy:
            TableName: !Ref SummariesTable
      Events:
        ApiEvent:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY
            ApiId: !Ref HttpApi

  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      CorsConfiguration:
        AllowOrigins: !Split [",", !Ref AllowedOrigins]
        AllowMethods: ["GET", "POST", "OPTIONS"]
        AllowHeaders: ["Content-Type"]

  LeasePdfBucket:
    Type: AWS::S3::Bucket
    Properties:
      LifecycleConfiguration:
        Rules:
          - Status: Enabled
            ExpirationInDays: 1

  SummariesTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: summaryId
          AttributeType: S
      KeySchema:
        - AttributeName: summaryId
          KeyType: HASH
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true

Outputs:
  ApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub "https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com"
  BucketName:
    Value: !Ref LeasePdfBucket
  TableName:
    Value: !Ref SummariesTable
```

- [ ] **Step 2: Verify the template is valid SAM syntax (requires AWS SAM CLI)**

```bash
sam validate --template template.yaml
```

Expected: `template.yaml is a valid SAM Template`

If SAM CLI is not installed: `pip install aws-sam-cli` or skip and verify on first deploy.

- [ ] **Step 3: Commit**

```bash
git add template.yaml
git commit -m "feat: add AWS SAM infrastructure template"
```

---

### Task 20: Amplify Build Configuration

**Files:**
- Create: `amplify.yml`
- Create: `frontend/.env.example`

- [ ] **Step 1: Write amplify.yml**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend && npm ci
    build:
      commands:
        - cd frontend && npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - "**/*"
  cache:
    paths:
      - frontend/node_modules/**/*
```

- [ ] **Step 2: Write frontend/.env.example**

```
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com
```

- [ ] **Step 3: Update frontend/index.html title**

Open `frontend/index.html` and change:

```html
<title>Vite + React + TS</title>
```

to:

```html
<title>honestLease — Understand your lease before you sign</title>
```

- [ ] **Step 4: Run all tests one final time**

```bash
cd backend && python -m pytest tests/ -v
cd ../frontend && npx vitest run
```

Expected: All backend and frontend tests pass.

- [ ] **Step 5: Final commit**

```bash
git add amplify.yml frontend/.env.example frontend/index.html
git commit -m "chore: add Amplify build config and final polish"
```

---

## Deployment Checklist

After all tasks are complete:

1. **Deploy backend:**
   ```bash
   sam build && sam deploy --guided
   # Supply: stack name, region, AnthropicApiKey, AllowedOrigins
   # Note the ApiUrl output
   ```

2. **Set frontend env:** In Amplify Console → App settings → Environment variables, add `VITE_API_URL` = the `ApiUrl` output from step 1.

3. **Connect Amplify:** In Amplify Console, connect your git repo and select `amplify.yml` as the build spec.

4. **Update CORS:** Re-deploy backend with `AllowedOrigins` set to your Amplify app URL.

5. **Smoke test:** Upload `backend/tests/fixtures/sample_lease.pdf` and verify the results page loads and the shareable link works.
