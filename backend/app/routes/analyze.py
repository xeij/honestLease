from fastapi import APIRouter, HTTPException

from ..models import AnalyzeRequest, AnalyzeResponse
from ..services import storage, pdf_parser, claude_client, summary_store

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    pdf_bytes = storage.fetch_pdf(request.s3Key)

    try:
        text = pdf_parser.extract_text(pdf_bytes)
    except Exception:
        storage.delete_pdf(request.s3Key)
        raise HTTPException(status_code=422, detail="Could not read this PDF. Please upload a text-based lease document.")

    try:
        pdf_parser.validate_text(text)
    except ValueError as e:
        storage.delete_pdf(request.s3Key)
        raise HTTPException(status_code=422, detail=str(e))

    summary = claude_client.analyze_lease(text)
    summary_id = summary_store.save_summary(summary)
    storage.delete_pdf(request.s3Key)

    return AnalyzeResponse(summaryId=summary_id)
