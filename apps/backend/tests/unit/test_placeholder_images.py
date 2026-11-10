"""Bundled placeholders must have uploaded bytes and persistent image references."""

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from core.framework.media.image import Image
from core.framework.storage import Storage
from core.access.imageAccess import ImageAccess
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.storageObject import StorageObjectRow
from default.access.playlistAccess import PlaylistAccess
from result import Result, ResultCode


async def test_bundled_playlist_placeholder_uploads_converted_bytes(monkeypatch):
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
    session = SimpleNamespace()

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
async def test_existing_placeholder_is_repaired_or_reports_failure(monkeypatch, restore_ok):
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
        session=SimpleNamespace(), filename="playlist-placeholder.png"
    )

    assert result.is_ok() is restore_ok
    assert restore.call_args.kwargs["key"] == stored.key
    assert restore.call_args.kwargs["data"].startswith(b"RIFF")
    upload.assert_not_awaited()
    if result.is_ok():
        assert result.result() is image


async def test_playlist_persists_prepared_image_reference():
    rows = []
    session = SimpleNamespace(
        add=lambda **kwargs: rows.append(kwargs["instance"]),
        flush=AsyncMock(),
        refresh=AsyncMock(),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    result = await PlaylistAccess.create_playlist_async(
        session=session, name="New playlist", owner_id=1, provider_id=2, image_id=9
    )
    assert result.is_ok()
    assert result.result().image_id == 9
    assert len(rows) == 2


def test_all_placeholder_assets_are_bundled():
    assets = Path(__file__).resolve().parents[2] / "assets" / "placeholders"
    for kind in ("playlist", "song", "user", "video", "radio"):
        assert (assets / f"{kind}-placeholder.png").read_bytes().startswith(b"\x89PNG")
