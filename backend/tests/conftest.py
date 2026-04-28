import os
import pytest
import boto3
from moto import mock_aws

os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SECURITY_TOKEN", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("S3_BUCKET_NAME", "test-lease-bucket")
os.environ.setdefault("DYNAMODB_TABLE_NAME", "test-summaries")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("CLAUDE_MODEL", "claude-sonnet-4-6")
os.environ.setdefault("AWS_LAMBDA_FUNCTION_NAME", "test-function")


@pytest.fixture
def s3_bucket():
    with mock_aws():
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="test-lease-bucket")
        yield s3


@pytest.fixture
def dynamodb_table():
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-summaries",
            KeySchema=[{"AttributeName": "summaryId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "summaryId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        client = boto3.client("dynamodb", region_name="us-east-1")
        client.update_time_to_live(
            TableName="test-summaries",
            TimeToLiveSpecification={"AttributeName": "ttl", "Enabled": True},
        )
        yield table
