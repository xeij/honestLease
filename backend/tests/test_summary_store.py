import time
import pytest
from moto import mock_aws
from app.services.summary_store import save_summary, get_summary, generate_summary_id

SAMPLE_SUMMARY = {
    "intro": "Your lease has a few things to watch out for.",
    "categories": [
        {
            "name": "Auto-Renewal Clauses",
            "severity": "red",
            "findings": ["Auto-renews 60 days before expiry."],
        }
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
