"""Bundled placeholders must have uploaded bytes and persistent image references."""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from botocore.stub import Stubber
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.storageObject import StorageObjectRow
from core.access.imageAccess import ImageAccess
from core.framework import storage
from core.framework.media.image import Image
from core.framework.storage import Storage
from default.access.playlistAccess import PlaylistAccess
from result import Result, ResultCode


async def test_bundled_playlist_placeholder_uploads_converted_bytes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    stored = StorageObjectRow(id=7, bucket="test", key="playlist-placeholder.webp")
    image = ImageRow(id=9, storage_object_id=7)
    monkeypatch.setattr(
        Image,
        "get_image_from_key_async",
        AsyncMock(return_value=Result(code=ResultCode.NOT_FOUND, message="Missing")),
    )
    upload = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=stored))
    insert = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=image))
    monkeypatch.setattr(Storage, "upload_bytes_async", upload)
    monkeypatch.setattr(ImageAccess, "insert_image_async", insert)
    session = MagicMock(spec=AsyncSession)

    result = await Image.ensure_default_image_async(
        session=session, filename="playlist-placeholder.png"
    )

    assert result.is_ok()
    assert result.result().storage_object_id == 7
    args = upload.call_args.kwargs
    assert args["key"] == "playlist-placeholder.webp"
    assert args["original_key"] == "playlist-placeholder.png"
    assert args["content_type"] == "image/webp"
    assert args["data"].startswith(b"RIFF")
    assert insert.call_args.kwargs["storage_object_id"] == 7


@pytest.mark.parametrize("restore_ok", [True, False])
async def test_existing_placeholder_is_repaired_or_reports_failure(
    monkeypatch: pytest.MonkeyPatch, restore_ok: bool
) -> None:
    stored = StorageObjectRow(
        id=7,
        bucket="test",
        key="playlist-placeholder.webp",
        original_key="playlist-placeholder.png",
    )
    image = ImageRow(id=9, storage_object_id=7)
    image.storage_object = stored
    monkeypatch.setattr(
        Image,
        "get_image_from_key_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=image)),
    )
    monkeypatch.setattr(Storage, "object_exists_async", AsyncMock(return_value=False))
    restore = AsyncMock(return_value=restore_ok)
    upload = AsyncMock()
    monkeypatch.setattr(Storage, "restore_object_async", restore)
    monkeypatch.setattr(Storage, "upload_bytes_async", upload)

    result = await Image.ensure_default_image_async(
        session=MagicMock(spec=AsyncSession), filename="playlist-placeholder.png"
    )

    assert result.is_ok() is restore_ok
    assert restore.call_args.kwargs["bucket"] == stored.bucket
    assert restore.call_args.kwargs["key"] == stored.key
    assert restore.call_args.kwargs["data"].startswith(b"RIFF")
    upload.assert_not_awaited()
    if result.is_ok():
        assert result.result() is image


@pytest.mark.parametrize("exists,upload_fails", [(True, False), (False, False), (False, True)])
async def test_existing_image_checks_and_repairs_its_recorded_s3_location(
    monkeypatch: pytest.MonkeyPatch, exists: bool, upload_fails: bool
) -> None:
    """S3 verification and repair use the same bucket even after configuration changes."""
    stored = StorageObjectRow(id=7, bucket="original-bucket", key="playlist-placeholder.png")
    image = ImageRow(id=9, storage_object_id=7)
    image.storage_object = stored
    monkeypatch.setattr(
        Image,
        "get_image_from_key_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=image)),
    )
    monkeypatch.setattr(storage.settings, "S3_BUCKET", "new-bucket")
    monkeypatch.setattr(Storage, "ensure_bucket_async", AsyncMock())
    upload = AsyncMock()
    monkeypatch.setattr(Storage, "upload_bytes_async", upload)
    client = storage.get_s3_client()
    data = b"placeholder-bytes"
    location = {"Bucket": stored.bucket, "Key": stored.key}
    with Stubber(client) as stubber:
        if exists:
            stubber.add_response("head_object", {}, location)
        else:
            stubber.add_client_error(
                "head_object",
                service_error_code="404",
                http_status_code=404,
                expected_params=location,
            )
            params = {**location, "Body": data, "ContentType": "image/png"}
            if upload_fails:
                stubber.add_client_error(
                    "put_object",
                    service_error_code="AccessDenied",
                    http_status_code=403,
                    expected_params=params,
                )
            else:
                stubber.add_response("put_object", {}, params)

        result = await Image.ensure_image_from_bytes_async(
            session=MagicMock(spec=AsyncSession),
            key=stored.key,
            data=data,
            filename=stored.key,
            content_type="image/png",
            target_format=None,
        )

        assert result.is_ok() is not upload_fails
        if result.is_ok():
            assert result.result() is image
        stubber.assert_no_pending_responses()
    upload.assert_not_awaited()


async def test_playlist_persists_prepared_image_reference() -> None:
    session = MagicMock(spec=AsyncSession)
    result = await PlaylistAccess.create_playlist_async(
        session=session, name="New playlist", owner_id=1, provider_id=2, image_id=9
    )
    assert result.is_ok()
    assert result.result().image_id == 9
    assert session.add.call_count == 2


def test_all_placeholder_assets_are_bundled() -> None:
    assets = Path(__file__).resolve().parents[2] / "assets" / "placeholders"
    for kind in ("playlist", "song", "user", "video", "radio"):
        assert (assets / f"{kind}-placeholder.png").read_bytes().startswith(b"\x89PNG")
