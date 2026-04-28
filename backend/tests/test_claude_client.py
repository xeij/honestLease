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
