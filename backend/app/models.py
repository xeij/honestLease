import re
from typing import Literal, Optional
from pydantic import BaseModel, field_validator

_S3_KEY_RE = re.compile(
    r"^leases/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$"
)


class UploadResponse(BaseModel):
    presignedUrl: str
    s3Key: str


class AnalyzeRequest(BaseModel):
    s3Key: str

    @field_validator("s3Key")
    @classmethod
    def validate_s3_key(cls, v: str) -> str:
        if not _S3_KEY_RE.match(v):
            raise ValueError("Invalid s3Key")
        return v


class AnalyzeResponse(BaseModel):
    summaryId: str


class Finding(BaseModel):
    summary: str
    quote: Optional[str] = None
    action: Optional[str] = None


class Category(BaseModel):
    name: Literal[
        "Auto-Renewal Clauses",
        "Deposit Conditions",
        "Unusual Fees",
        "Missing Standard Clauses",
    ]
    severity: Literal["red", "yellow", "green"]
    findings: list[Finding]

    @field_validator("findings", mode="before")
    @classmethod
    def coerce_string_findings(cls, v: list) -> list:
        return [f if isinstance(f, dict) else {"summary": f} for f in v]


class KeyNumbers(BaseModel):
    monthlyRent: Optional[str] = None
    securityDeposit: Optional[str] = None
    leaseLength: Optional[str] = None
    lateFee: Optional[str] = None
    earlyTerminationFee: Optional[str] = None


class Summary(BaseModel):
    intro: str
    verdict: Literal["standard", "review", "concern"] = "review"
    keyNumbers: Optional[KeyNumbers] = None
    categories: list[Category]


class SummaryRecord(BaseModel):
    summaryId: str
    summary: Summary
    createdAt: int
