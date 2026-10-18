from typing import cast
from collections.abc import AsyncGenerator
from collections.abc import Iterator
from sqlalchemy.ext.asyncio import AsyncSession
from mypy_boto3_s3 import S3Client
from starlette.responses import Response, StreamingResponse
from pathlib import Path

"""Hermetic S3 transport contracts, resource cleanup, and publication failures."""

import hashlib
from unittest.mock import AsyncMock, Mock

from moto import mock_aws
import pytest

from backend import constants
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from backend.core.access.objectStore import get_s3_client
from backend.core.framework.storage import Storage, parse_range
from backend.core.access.storageObjectAccess import StorageObjectAccess

pytestmark = pytest.mark.unit


@pytest.fixture
def objects(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Iterator[S3Client]:
    with mock_aws():
        monkeypatch.setattr(constants, "S3_PRIVATE_ENDPOINT_URL", None)
        monkeypatch.setattr(constants, "S3_PUBLIC_ENDPOINT_URL", None)
        monkeypatch.setattr(constants, "S3_ACCESS_KEY", "testing")
        monkeypatch.setattr(constants, "S3_SECRET_KEY", "testing")
        monkeypatch.setattr(constants, "S3_BUCKET", "rockit-unit-test")
        monkeypatch.setattr(constants, "S3_REGION", "us-east-1")
        monkeypatch.setattr(constants, "TEMP_PATH", str(tmp_path))
        get_s3_client.cache_clear()
        client = get_s3_client()
        client.create_bucket(Bucket=constants.S3_BUCKET)
        client.put_object(
            Bucket=constants.S3_BUCKET,
            Key="audio.mp3",
            Body=b"0123456789",
            ContentType="audio/mpeg",
        )
        yield client
        get_s3_client.cache_clear()


@pytest.mark.parametrize(
    "value,size,expected",
    [
        (None, 10, (0, 9, 200)),
        ("bytes=0-1", 10, (0, 1, 206)),
        ("bytes=4-", 10, (4, 9, 206)),
        ("bytes=-3", 10, (7, 9, 206)),
        ("bytes=8-99", 10, (8, 9, 206)),
        ("bytes=-99", 10, (0, 9, 206)),
        ("bytes=10-", 10, None),
        ("bytes=3-1", 10, None),
        ("bytes=-0", 10, None),
        ("bytes=0-1,4-5", 10, None),
        ("bytes=x-", 10, None),
        ("bytes=+1-2", 10, None),
        ("items=0-1", 10, None),
        ("bytes=0-", 0, None),
        (None, 0, (0, -1, 200)),
    ],
)
def test_ranges(
    value: str | None, size: int, expected: tuple[int, int, int] | None
) -> None:
    assert parse_range(value=value, size=size) == expected


async def body(response: Response | StreamingResponse) -> bytes:
    if isinstance(response, StreamingResponse):
        return b"".join(
            chunk.encode() if isinstance(chunk, str) else bytes(chunk)
            for chunk in [item async for item in response.body_iterator]
        )
    return bytes(response.body)


@pytest.mark.parametrize(
    "header,status,expected",
    [
        (None, 200, b"0123456789"),
        ("bytes=0-1", 206, b"01"),
        ("bytes=-3", 206, b"789"),
        ("bytes=10-", 416, b""),
    ],
)
async def test_stream_exact_body(
    objects: S3Client, header: str | None, status: int, expected: bytes
) -> None:
    row = StorageObjectRow(bucket=constants.S3_BUCKET, key="audio.mp3")
    result = await Storage.stream_async(storage_object=row, range_header=header)
    assert result.is_ok()
    response = result.result()
    assert response.status_code == status
    assert await body(response) == expected
    assert response.headers["content-length"] == str(len(expected))
    assert ("content-range" in response.headers) == (status != 200)


async def test_head_empty_and_missing(objects: S3Client) -> None:
    row = StorageObjectRow(bucket=constants.S3_BUCKET, key="audio.mp3")
    head = await Storage.stream_async(
        storage_object=row, head_only=True, range_header="bytes=1-2"
    )
    assert head.is_ok() and head.result().status_code == 200
    assert (
        head.result().headers["content-length"] == "10"
        and await body(head.result()) == b""
    )
    objects.put_object(Bucket=constants.S3_BUCKET, Key="empty", Body=b"")
    empty = await Storage.stream_async(
        storage_object=StorageObjectRow(bucket=constants.S3_BUCKET, key="empty")
    )
    assert empty.is_ok() and await body(empty.result()) == b""
    missing = await Storage.stream_async(
        storage_object=StorageObjectRow(bucket=constants.S3_BUCKET, key="absent")
    )
    assert missing.code() == AResultCode.NOT_FOUND


async def test_successful_file_upload_is_bounded_and_checksummed(
    objects: S3Client, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "large.mp3"
    path.write_bytes(b"x" * (9 * 1024 * 1024))

    async def register(
        session: AsyncSession, row: StorageObjectRow
    ) -> AResult[StorageObjectRow]:
        row.id = 42
        return AResult.ok(result=row)

    monkeypatch.setattr(StorageObjectAccess, "register_async", register)
    async with AsyncSession() as session:
        uploaded = await Storage.upload_file_async(session=session, path=str(path))
        assert uploaded.is_ok()
        obj = uploaded.result()
        assert obj.size_bytes == path.stat().st_size
        assert obj.sha256 == hashlib.sha256(path.read_bytes()).hexdigest()
        # Multipart ETags differ from content hashes.
        assert obj.etag is not None and "-" in obj.etag
        local = await Storage.materialize_async(storage_object=obj)
        assert local.is_ok() and Path(local.result()).read_bytes() == path.read_bytes()


async def test_registration_failure_removes_uploaded_bytes(
    objects: S3Client, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "failed.mp3"
    path.write_bytes(b"data")
    monkeypatch.setattr(
        StorageObjectAccess,
        "register_async",
        AsyncMock(
            return_value=AResult(code=AResultCode.GENERAL_ERROR, message="DB failed")
        ),
    )
    async with AsyncSession() as session:
        result = await Storage.upload_file_async(session=session, path=str(path))
    assert result.is_not_ok()
    assert [
        item.get("Key", "")
        for item in objects.list_objects_v2(Bucket=constants.S3_BUCKET).get(
            "Contents", []
        )
    ] == ["audio.mp3"]


async def test_stream_closes_body_on_reader_cancel(
    objects: S3Client, monkeypatch: pytest.MonkeyPatch
) -> None:
    transport = Mock()
    transport.head_object.return_value = {
        "ContentLength": 10,
        "ContentType": "audio/mpeg",
    }
    remote = Mock()
    remote.read.side_effect = [b"first", b"second", b""]
    transport.get_object.return_value = {"Body": remote}
    monkeypatch.setattr(
        "backend.core.framework.storage.get_s3_client", lambda: transport
    )
    result = await Storage.stream_async(
        storage_object=StorageObjectRow(bucket=constants.S3_BUCKET, key="audio.mp3")
    )
    assert result.is_ok()
    response = result.result()
    assert isinstance(response, StreamingResponse)
    iterator = cast(AsyncGenerator[bytes, None], response.body_iterator)
    assert await anext(iterator) == b"first"
    await iterator.aclose()
    remote.close.assert_called_once()


async def test_bad_storage_locator_is_rejected(objects: S3Client) -> None:
    for uri in ["/etc/passwd", "https://example.com/file", "s3://other-bucket/file"]:
        result = await Storage.materialize_uri_async(uri=uri)
        assert result.code() == AResultCode.BAD_REQUEST
