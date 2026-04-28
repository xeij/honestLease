import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from moto import mock_aws
import pytest

from app.main import app

client = TestClient(app)


@mock_aws
def test_post_upload_returns_presigned_url_and_key(s3_bucket):
    response = client.post("/upload")
    assert response.status_code == 200
    data = response.json()
    assert "presignedUrl" in data
    assert data["presignedUrl"].startswith("https://")
    assert data["s3Key"].startswith("leases/")
    assert data["s3Key"].endswith(".pdf")
