"""Unit tests for private and public S3 client selection."""

import sys
from pathlib import Path
from typing import cast
from unittest.mock import Mock
from urllib.parse import urlsplit

import pytest

from core.access.db.ormModels.storageObject import StorageObjectRow  # noqa: E402
from core.framework import storage  # noqa: E402
from result import ResultCode

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
    """Backend and client-facing operations can target different endpoints."""

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


@pytest.mark.parametrize("region", ["eu-south-2", "eu-west-1", "us-east-1"])
def test_aws_public_urls_do_not_require_s3_clients_or_credentials(
    monkeypatch: pytest.MonkeyPatch, region: str
) -> None:
    """Public objects use regional AWS URLs without signing or credential lookup."""

    monkeypatch.setattr(storage.settings, "S3_PRIVATE_ENDPOINT_URL", None)
    monkeypatch.setattr(storage.settings, "S3_PUBLIC_ENDPOINT_URL", None)
    monkeypatch.setattr(storage.settings, "S3_REGION", region)
    monkeypatch.setattr(storage.settings, "S3_ACCESS_KEY", None)
    monkeypatch.setattr(storage.settings, "S3_SECRET_KEY", None)
    client = Mock(side_effect=AssertionError("URL generation must not create an S3 client"))
    monkeypatch.setattr(storage.boto3, "client", client)

    url = storage.Storage.get_public_url(
        storage_object=StorageObjectRow(bucket="example-bucket", key="images/logo.webp")
    )
    assert url is not None
    parsed = urlsplit(url)

    expected_host = (
        "example-bucket.s3.amazonaws.com"
        if region == "us-east-1"
        else f"example-bucket.s3.{region}.amazonaws.com"
    )
    assert parsed.hostname == expected_host
    assert parsed.path == "/images/logo.webp"
    assert parsed.scheme == "https"
    assert parsed.query == ""
    client.assert_not_called()


@pytest.mark.parametrize("public_endpoint", [None, "https://files.example.com/prefix/"])
@pytest.mark.parametrize(
    "key,expected_path",
    [
        ("images/logo.webp", "images/logo.webp"),
        ("music/Björk #1?100%+.mp3", "music/Bj%C3%B6rk%20%231%3F100%25%2B.mp3"),
        ("/images//logo.webp", "/images//logo.webp"),
    ],
)
def test_object_urls_preserve_custom_endpoints_and_encode_keys(
    monkeypatch: pytest.MonkeyPatch,
    public_endpoint: str | None,
    key: str,
    expected_path: str,
) -> None:
    """Public and fallback endpoints preserve paths and escape reserved key characters."""

    monkeypatch.setattr(storage.settings, "S3_PRIVATE_ENDPOINT_URL", "http://minio:9000")
    monkeypatch.setattr(storage.settings, "S3_PUBLIC_ENDPOINT_URL", public_endpoint)
    client = Mock(side_effect=AssertionError("URL generation must not create an S3 client"))
    monkeypatch.setattr(storage.boto3, "client", client)

    obj = StorageObjectRow(bucket="example-bucket", key=key)
    expected_url = (
        f"{(public_endpoint or 'http://minio:9000').rstrip('/')}/example-bucket/{expected_path}"
    )
    assert storage.Storage.get_public_url(storage_object=obj) == expected_url
    assert storage.Storage.get_object_url(storage_object=obj) == expected_url
    client.assert_not_called()


async def test_image_url_is_public(monkeypatch: pytest.MonkeyPatch) -> None:
    """Image responses resolve the stored object without signing it."""
    from core.access.db.ormModels.image import ImageRow
    from core.framework.media.image import Image

    monkeypatch.setattr(storage.settings, "S3_PUBLIC_ENDPOINT_URL", "https://files.example.com")
    client = Mock(side_effect=AssertionError("URL generation must not create an S3 client"))
    monkeypatch.setattr(storage.boto3, "client", client)
    image = ImageRow(id=1, storage_object_id=1)
    image.storage_object = StorageObjectRow(bucket="example-bucket", key="images/cover.webp")
    result = await Image.get_internal_image_url_async(image=image)

    assert result.is_ok()
    assert result.result() == "https://files.example.com/example-bucket/images/cover.webp"
    client.assert_not_called()


async def test_missing_object_has_no_public_url() -> None:
    """Missing storage objects retain their empty URL and NOT_FOUND behavior."""
    assert storage.Storage.get_public_url(storage_object=None) is None
    result = await storage.Storage.get_public_url_async(storage_object=None)
    assert result.code() == ResultCode.NOT_FOUND


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
