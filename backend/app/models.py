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
