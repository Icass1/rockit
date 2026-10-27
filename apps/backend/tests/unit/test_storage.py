"""Unit tests for private and public S3 client selection."""

import sys
from pathlib import Path
from typing import cast
from urllib.parse import parse_qs, urlsplit

import pytest

from core.access.db.ormModels.storageObject import StorageObjectRow  # noqa: E402
from core.framework import storage  # noqa: E402

BACKEND_ROOT = Path(__file__).parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class FakeS3Client:
    """Small fake used to capture the endpoint assigned to each client."""

    def __init__(self, endpoint_url: str | None) -> None:
        self.endpoint_url = endpoint_url


def test_private_and_public_clients_use_separate_endpoints(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Backend operations and presigned URLs can target different endpoints."""

    clients: list[FakeS3Client] = []

    def fake_client(_service: str, **kwargs: object) -> FakeS3Client:
        client = FakeS3Client(cast(str | None, kwargs["endpoint_url"]))
        clients.append(client)
        return client

    monkeypatch.setattr(storage.boto3, "client", fake_client)
    monkeypatch.setattr(storage.settings, "S3_PRIVATE_ENDPOINT_URL", "http://minio:9000")
    monkeypatch.setattr(storage.settings, "S3_PUBLIC_ENDPOINT_URL", "https://files.example.com")
    monkeypatch.setattr(storage, "_private_client", None)
    monkeypatch.setattr(storage, "_public_client", None)

    private_client = cast(FakeS3Client, storage.get_s3_client())
    public_client = cast(FakeS3Client, storage.get_s3_client(public=True))

    assert private_client is clients[0]
    assert public_client is clients[1]
    assert private_client.endpoint_url == "http://minio:9000"
    assert public_client.endpoint_url == "https://files.example.com"


def test_public_client_falls_back_to_private_endpoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The public client uses the private endpoint when no public endpoint is set."""

    def factory(_service: str, **kwargs: object) -> FakeS3Client:
        """Build a fake client for the legacy endpoint test."""

        return FakeS3Client(cast(str | None, kwargs["endpoint_url"]))

    monkeypatch.setattr(storage.boto3, "client", factory)
    monkeypatch.setattr(storage.settings, "S3_PRIVATE_ENDPOINT_URL", "http://minio:9000")
    monkeypatch.setattr(storage.settings, "S3_PUBLIC_ENDPOINT_URL", None)
    monkeypatch.setattr(storage, "_private_client", None)
    monkeypatch.setattr(storage, "_public_client", None)

    client = cast(FakeS3Client, storage.get_s3_client(public=True))
    assert client.endpoint_url == "http://minio:9000"


@pytest.mark.parametrize("public", [False, True])
@pytest.mark.parametrize("region", ["eu-south-2", "eu-west-1", "us-east-1"])
def test_aws_presigned_urls_use_regional_sigv4(
    monkeypatch: pytest.MonkeyPatch, public: bool, region: str
) -> None:
    """Real SDK presigning targets the configured region and uses SigV4."""

    monkeypatch.setattr(storage.settings, "S3_PRIVATE_ENDPOINT_URL", None)
    monkeypatch.setattr(storage.settings, "S3_PUBLIC_ENDPOINT_URL", None)
    monkeypatch.setattr(storage.settings, "S3_REGION", region)
    monkeypatch.setattr(storage.settings, "S3_ACCESS_KEY", "test-access-key")
    monkeypatch.setattr(storage.settings, "S3_SECRET_KEY", "test-secret-key")
    monkeypatch.setattr(storage, "_private_client", None)
    monkeypatch.setattr(storage, "_public_client", None)

    client = storage.get_s3_client(public=public)
    url = client.generate_presigned_url(
        "get_object", Params={"Bucket": "example-bucket", "Key": "images/logo.webp"}
    )
    parsed = urlsplit(url)
    query = parse_qs(parsed.query)

    expected_host = (
        "example-bucket.s3.amazonaws.com"
        if region == "us-east-1"
        else f"example-bucket.s3.{region}.amazonaws.com"
    )
    assert parsed.hostname == expected_host
    assert parsed.path == "/images/logo.webp"
    assert query["X-Amz-Algorithm"] == ["AWS4-HMAC-SHA256"]
    assert f"/{region}/s3/aws4_request" in query["X-Amz-Credential"][0]
    assert "AWSAccessKeyId" not in query
    assert client is storage.get_s3_client(public=public)


def test_object_url_preserves_custom_public_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Custom public hosts keep path addressing and use SigV4."""

    monkeypatch.setattr(storage.settings, "S3_PRIVATE_ENDPOINT_URL", "http://minio:9000")
    monkeypatch.setattr(storage.settings, "S3_PUBLIC_ENDPOINT_URL", "https://files.example.com")
    monkeypatch.setattr(storage.settings, "S3_ACCESS_KEY", "test-access-key")
    monkeypatch.setattr(storage.settings, "S3_SECRET_KEY", "test-secret-key")
    monkeypatch.setattr(storage, "_public_client", None)

    url = storage.Storage.get_object_url(
        StorageObjectRow(bucket="example-bucket", key="images/logo.webp")
    )
    assert url is not None
    parsed = urlsplit(url)
    assert parsed.hostname == "files.example.com"
    assert parsed.path == "/example-bucket/images/logo.webp"
    assert parse_qs(parsed.query)["X-Amz-Algorithm"] == ["AWS4-HMAC-SHA256"]


@pytest.mark.asyncio
async def test_unconfigured_s3_does_not_contact_external_services(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from unittest.mock import AsyncMock

    network_call = AsyncMock()
    monkeypatch.setattr(storage.settings, "S3_BUCKET", "")
    monkeypatch.setattr(storage.asyncio, "to_thread", network_call)
    await storage.Storage.ensure_bucket_async()
    network_call.assert_not_awaited()
