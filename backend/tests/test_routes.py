import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from moto import mock_aws
import pytest

from app.main import app

client = TestClient(app)

VALID_S3_KEY = "leases/12345678-1234-1234-1234-123456789abc.pdf"

_FINDING_OK = {"summary": "Nothing concerning here.", "quote": None, "action": "No action needed."}

SAMPLE_CLAUDE_RESPONSE = {
    "intro": "Overall this lease is standard.",
    "verdict": "standard",
    "keyNumbers": {
        "monthlyRent": "$1,500/month",
        "securityDeposit": "$3,000",
        "leaseLength": "12 months",
        "lateFee": None,
        "earlyTerminationFee": None,
    },
    "categories": [
        {"name": "Auto-Renewal Clauses", "severity": "green", "findings": [_FINDING_OK]},
        {"name": "Deposit Conditions", "severity": "green", "findings": [_FINDING_OK]},
        {"name": "Unusual Fees", "severity": "green", "findings": [_FINDING_OK]},
        {"name": "Missing Standard Clauses", "severity": "green", "findings": [_FINDING_OK]},
    ],
}


@mock_aws
def test_post_upload_returns_presigned_url_and_key(s3_bucket):
    response = client.post("/upload")
    assert response.status_code == 200
    data = response.json()
    assert "presignedUrl" in data
    assert data["presignedUrl"].startswith("https://")
    assert data["s3Key"].startswith("leases/")
    assert data["s3Key"].endswith(".pdf")


@mock_aws
def test_post_analyze_returns_summary_id(s3_bucket, dynamodb_table):
    sample_pdf = open("tests/fixtures/sample_lease.pdf", "rb").read()
    s3_bucket.put_object(Bucket="test-lease-bucket", Key=VALID_S3_KEY, Body=sample_pdf)

    mock_msg = MagicMock()
    mock_msg.content = [MagicMock(text=json.dumps(SAMPLE_CLAUDE_RESPONSE))]

    with patch("app.services.claude_client.anthropic.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.create.return_value = mock_msg
        response = client.post("/analyze", json={"s3Key": VALID_S3_KEY})

    assert response.status_code == 200
    data = response.json()
    assert "summaryId" in data
    assert len(data["summaryId"]) == 8


@mock_aws
def test_post_analyze_returns_422_for_scanned_pdf(s3_bucket, dynamodb_table):
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 10, "Hi")
    tiny_pdf = bytes(pdf.output())
    s3_bucket.put_object(Bucket="test-lease-bucket", Key=VALID_S3_KEY, Body=tiny_pdf)

    response = client.post("/analyze", json={"s3Key": VALID_S3_KEY})
    assert response.status_code == 422
    assert "scanned image" in response.json()["detail"]


@mock_aws
def test_post_analyze_rejects_invalid_s3_key(s3_bucket, dynamodb_table):
    response = client.post("/analyze", json={"s3Key": "leases/../secrets.pdf"})
    assert response.status_code == 422


@mock_aws
def test_post_analyze_rejects_non_uuid_s3_key(s3_bucket, dynamodb_table):
    response = client.post("/analyze", json={"s3Key": "leases/test.pdf"})
    assert response.status_code == 422


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
