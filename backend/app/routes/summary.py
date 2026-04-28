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
