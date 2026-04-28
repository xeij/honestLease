from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from ..models import SummaryRecord, Summary
from ..services.summary_store import get_summary

router = APIRouter()


@router.get("/summary/{summary_id}", response_model=SummaryRecord)
def get(summary_id: str):
    item = get_summary(summary_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Summary not found or has expired.")

    status = item.get("status", "done")

    if status == "pending":
        return JSONResponse(status_code=202, content={"status": "pending"})

    if status == "failed":
        raise HTTPException(status_code=422, detail="Analysis failed. Please try uploading again.")

    return SummaryRecord(
        summaryId=item["summaryId"],
        summary=Summary(**item["summary"]),
        createdAt=item["createdAt"],
    )
