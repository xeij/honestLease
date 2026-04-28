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
