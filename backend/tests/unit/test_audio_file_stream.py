"""Provider audio streams preserve exact seeks without buffering entire files."""

import asyncio
import importlib
from pathlib import Path
from collections.abc import AsyncGenerator
from typing import cast
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.media.stream import CHUNK_SIZE, MediaStream
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    "provider,access,lookup,prefix",
    [
        ("spotify", "SpotifyAccess", "get_track_spotify_id_async", "spotify"),
        (
            "spotifyScrapper",
            "SpotifyScrapperAccess",
            "get_track_spotify_id_async",
            "spotify_scrapper",
        ),
        (
            "youtubeMusic",
            "YoutubeMusicAccess",
            "get_track_by_public_id_async",
            "youtube-music",
        ),
    ],
)
@pytest.mark.parametrize(
    "header,status,expected,content_range",
    [
        (None, 200, b"0123456789", None),
        ("bytes=0-1", 206, b"01", "bytes 0-1/10"),
        ("bytes=4-", 206, b"456789", "bytes 4-9/10"),
        ("bytes=-3", 206, b"789", "bytes 7-9/10"),
        ("bytes=8-99", 206, b"89", "bytes 8-9/10"),
        ("bytes=10-", 416, b"", "bytes */10"),
        ("bytes=3-1", 416, b"", "bytes */10"),
        ("bytes=-0", 416, b"", "bytes */10"),
        ("bytes=not-a-range", 416, b"", "bytes */10"),
        ("bytes=0-1,4-5", 416, b"", "bytes */10"),
    ],
)
async def test_provider_audio_http_ranges(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
    access: str,
    lookup: str,
    prefix: str,
    header: str | None,
    status: int,
    expected: bytes,
    content_range: str | None,
) -> None:
    """Exercise the actual provider and controller, replacing only the DB lookup."""
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"0123456789")
    module = importlib.import_module(f"backend.{provider}.framework.{provider}")
    controller = importlib.import_module(
        f"backend.{provider}.controllers.{provider}Controller"
    )
    monkeypatch.setattr(module, "MEDIA_PATH", str(tmp_path))
    track_lookup = AsyncMock(
        return_value=AResult(
            code=AResultCode.OK,
            message="OK",
            result=SimpleNamespace(path=audio.name),
        )
    )
    monkeypatch.setattr(getattr(module, access), lookup, track_lookup)
    monkeypatch.setattr(
        DBSessionMiddleware,
        "get_session",
        Mock(return_value=AsyncMock(spec=AsyncSession)),
    )
    app = FastAPI()
    app.include_router(controller.router)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(
            f"/{prefix}/audio/track", headers={"Range": header} if header else {}
        )
        assert response.status_code == status
        assert response.content == expected
        assert response.headers.get("content-range") == content_range
        assert response.headers["content-length"] == str(len(expected))
        assert response.headers["accept-ranges"] == "bytes"
        if status != 416:
            assert response.headers["content-type"] == "audio/mpeg"
        # Deleted files retain the existing not-found behavior.
        audio.unlink()
        missing = await client.get(f"/{prefix}/audio/track")
        assert missing.status_code == 404
        # Metadata without a downloaded path also remains not-found.
        track_lookup.return_value = AResult(
            code=AResultCode.OK, message="OK", result=SimpleNamespace(path=None)
        )
        unavailable = await client.get(f"/{prefix}/audio/track")
        assert unavailable.status_code == 404


async def test_stream_is_lazy_bounded_and_closes_on_early_stop(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A large open-ended range produces its first chunk without reading the tail."""
    audio = tmp_path / "large.mp3"
    audio.write_bytes(b"a" * CHUNK_SIZE + b"b" * CHUNK_SIZE + b"tail")
    from backend.core.framework.media import stream

    read = AsyncMock(return_value=b"a" * CHUNK_SIZE)
    handle = SimpleNamespace(seek=AsyncMock(), read=read)
    context = AsyncMock()
    context.__aenter__.return_value = handle
    open_file = Mock(return_value=context)
    monkeypatch.setattr(stream.aiofiles, "open", open_file)
    result = await MediaStream.stream_audio_file_async(
        audio_path=str(audio), range_header="bytes=0-"
    )
    assert result.is_ok()
    open_file.assert_not_called()
    response = result.result()
    # Test the generator directly: an in-memory HTTP transport buffers responses.
    iterator = cast(AsyncGenerator[bytes, None], response.body_iterator)
    first = await anext(iterator)
    assert first == b"a" * CHUNK_SIZE
    read.assert_awaited_once_with(CHUNK_SIZE)
    await iterator.aclose()
    context.__aexit__.assert_awaited_once()
    assert sorted(path.name for path in tmp_path.iterdir()) == [audio.name]


async def test_concurrent_ranges_do_not_share_file_position(tmp_path: Path) -> None:
    """Independent file handles preserve simultaneous probes and seeks."""
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"0123456789")

    async def read_range(header: str) -> bytes:
        result = await MediaStream.stream_audio_file_async(
            audio_path=str(audio), range_header=header
        )
        assert result.is_ok()
        chunks: list[bytes] = []
        async for chunk in result.result().body_iterator:
            assert isinstance(chunk, bytes)
            chunks.append(chunk)
            await asyncio.sleep(0)
        return b"".join(chunks)

    assert await asyncio.gather(
        read_range(header="bytes=0-1"), read_range(header="bytes=7-")
    ) == [b"01", b"789"]
