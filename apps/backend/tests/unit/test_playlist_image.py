"""Playlist covers validate uploads, enforce ownership, and use stored media artwork."""

from io import BytesIO
from typing import cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from PIL import Image as PillowImage
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.storageObject import StorageObjectRow
from core.framework.media.image import Image
from core.framework.storage import Storage
from default.access.db.ormModels.playlist import PlaylistRow
from default.access.playlistAccess import PlaylistAccess
from default.access.playlistImageAccess import PlaylistImageAccess
from default.framework.playlistImage import (
    MAX_PLAYLIST_IMAGE_BYTES,
    PlaylistImage,
    render_cover,
)
from result import Result, ResultCode


def artwork(color: str = "red") -> bytes:
    data = BytesIO()
    PillowImage.new("RGB", (40, 20), color).save(data, format="PNG")
    return data.getvalue()


@pytest.fixture
def owner(monkeypatch: pytest.MonkeyPatch) -> None:
    playlist = PlaylistRow(id=10, name="Mix", image_id=1, owner_id=7)
    monkeypatch.setattr(
        PlaylistAccess,
        "get_playlist_by_public_id_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=playlist)),
    )


@pytest.mark.parametrize("generated", [False, True])
async def test_non_owner_cannot_write_or_read_artwork(
    monkeypatch: pytest.MonkeyPatch,
    owner: None,
    generated: bool,
) -> None:
    read, create = AsyncMock(), AsyncMock()
    monkeypatch.setattr(PlaylistImageAccess, "artwork_async", read)
    monkeypatch.setattr(Image, "create_image_from_bytes_async", create)
    result = await PlaylistImage.set_playlist_image_async(
        session=MagicMock(spec=AsyncSession),
        playlist_public_id="list",
        user_id=8,
        data=None if generated else artwork(),
    )
    assert result.code() == ResultCode.NOT_FOUND
    read.assert_not_awaited()
    create.assert_not_awaited()


@pytest.mark.parametrize("data", [b"", b"not an image", b"x" * (MAX_PLAYLIST_IMAGE_BYTES + 1)])
async def test_invalid_upload_does_not_write_storage(
    monkeypatch: pytest.MonkeyPatch,
    owner: None,
    data: bytes,
) -> None:
    create = AsyncMock()
    monkeypatch.setattr(Image, "create_image_from_bytes_async", create)
    result = await PlaylistImage.set_playlist_image_async(
        session=MagicMock(spec=AsyncSession),
        playlist_public_id="list",
        user_id=7,
        data=data,
    )
    assert result.code() == ResultCode.BAD_REQUEST
    create.assert_not_awaited()


async def test_upload_normalizes_and_assigns_new_stored_image(
    monkeypatch: pytest.MonkeyPatch,
    owner: None,
) -> None:
    image = ImageRow(id=42, storage_object_id=5)
    create = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=image))
    assign = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=True))
    monkeypatch.setattr(Image, "create_image_from_bytes_async", create)
    monkeypatch.setattr(PlaylistImageAccess, "assign_async", assign)
    session = MagicMock(spec=AsyncSession)
    result = await PlaylistImage.set_playlist_image_async(
        session=session,
        playlist_public_id="list",
        user_id=7,
        data=artwork(),
    )
    assert result.is_ok()
    assign.assert_awaited_once_with(session=session, playlist_id=10, image=image)
    assert create.call_args.kwargs["target_format"] is None
    with PillowImage.open(BytesIO(create.call_args.kwargs["data"])) as encoded:
        assert encoded.format == "WEBP"
        assert encoded.size == (1024, 1024)


@pytest.mark.parametrize("count", [1, 2, 4, 5, 9])
def test_generated_cover_contains_media_colors_and_styled_border(count: int) -> None:
    colors = ["red", "blue", "green", "yellow", "purple", "orange", "cyan", "white", "gray"]
    data = render_cover(artworks=[artwork(color=c) for c in colors[:count]], generated=True)
    with PillowImage.open(BytesIO(data)) as cover:
        assert cover.size == (1024, 1024)
        assert cover.format == "WEBP"
        # The first tile remains red while the frame has a darker tint.
        tile = cast(tuple[int, int, int], cover.getpixel((150, 150)))
        border = cast(tuple[int, int, int], cover.getpixel((20, 20)))
        assert tile[0] > 200 and tile[1] < 30
        assert border[0] < tile[0]


async def test_generation_skips_missing_and_corrupt_artwork(
    monkeypatch: pytest.MonkeyPatch,
    owner: None,
) -> None:
    images = [ImageRow(id=i, storage_object_id=i) for i in range(3)]
    for image in images:
        image.storage_object = StorageObjectRow(id=image.id, bucket="test", key=str(image.id))
    monkeypatch.setattr(
        PlaylistImageAccess,
        "artwork_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=images)),
    )
    download = AsyncMock(
        side_effect=[
            Result(code=ResultCode.NOT_FOUND, message="Missing"),
            Result(code=ResultCode.OK, message="OK", result=b"corrupt"),
            Result(code=ResultCode.OK, message="OK", result=artwork()),
        ]
    )
    monkeypatch.setattr(Storage, "download_bytes_async", download)
    create = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=images[0]))
    monkeypatch.setattr(Image, "create_image_from_bytes_async", create)
    assign = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=True))
    monkeypatch.setattr(PlaylistImageAccess, "assign_async", assign)
    result = await PlaylistImage.set_playlist_image_async(
        session=MagicMock(spec=AsyncSession),
        playlist_public_id="list",
        user_id=7,
    )
    assert result.is_ok()
    assert download.await_count == 3
    create.assert_awaited_once()
    assign.assert_awaited_once()


async def test_empty_playlist_keeps_existing_cover(
    monkeypatch: pytest.MonkeyPatch,
    owner: None,
) -> None:
    monkeypatch.setattr(
        PlaylistImageAccess,
        "artwork_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=[])),
    )
    create = AsyncMock()
    monkeypatch.setattr(Image, "create_image_from_bytes_async", create)
    result = await PlaylistImage.set_playlist_image_async(
        session=MagicMock(spec=AsyncSession),
        playlist_public_id="list",
        user_id=7,
    )
    assert result.code() == ResultCode.BAD_REQUEST
    create.assert_not_awaited()


async def test_storage_failure_never_assigns_image(
    monkeypatch: pytest.MonkeyPatch,
    owner: None,
) -> None:
    monkeypatch.setattr(
        Image,
        "create_image_from_bytes_async",
        AsyncMock(
            return_value=Result(code=ResultCode.GENERAL_ERROR, message="Storage unavailable"),
        ),
    )
    assign = AsyncMock()
    monkeypatch.setattr(PlaylistImageAccess, "assign_async", assign)
    result = await PlaylistImage.set_playlist_image_async(
        session=MagicMock(spec=AsyncSession),
        playlist_public_id="list",
        user_id=7,
        data=artwork(),
    )
    assert result.is_not_ok()
    assign.assert_not_awaited()
