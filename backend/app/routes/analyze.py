import json
import os

import boto3
from fastapi import APIRouter

from ..models import AnalyzeRequest, AnalyzeResponse
from ..services.summary_store import generate_summary_id, save_pending

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    summary_id = generate_summary_id()
    save_pending(summary_id, request.s3Key)

    boto3.client("lambda").invoke(
        FunctionName=os.environ["AWS_LAMBDA_FUNCTION_NAME"],
        InvocationType="Event",
        Payload=json.dumps({"summaryId": summary_id, "s3Key": request.s3Key}).encode(),
    )

    return AnalyzeResponse(summaryId=summary_id)
