"""Exact byte ranges are required by Safari's initial probe and later seeks."""

from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from fastapi.responses import StreamingResponse

from core.framework.media import stream
from core.framework.media.stream import MediaStream
from result import Result, ResultCode

pytestmark = pytest.mark.unit


async def read_body(response: StreamingResponse) -> bytes:
    """Read the exact binary representation sent to the media element."""
    chunks: list[bytes] = []
    async for chunk in response.body_iterator:
        assert isinstance(chunk, bytes)
        chunks.append(chunk)
    return b"".join(chunks)


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
async def test_exact_audio_byte_ranges(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    header: str | None,
    status: int,
    expected: bytes,
    content_range: str | None,
) -> None:
    audio = tmp_path / "audio.mp3"
    audio.write_bytes(b"0123456789")
    monkeypatch.setattr(
        MediaStream,
        "_prepare_audio_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=str(audio))),
    )
    result = await MediaStream.stream_audio_from_video_async(
        video_path="source", range_header=header
    )
    assert result.is_ok()
    response = result.result()
    body = await read_body(response=response)
    assert response.status_code == status
    assert response.headers.get("content-range") == content_range
    assert response.headers["content-length"] == str(len(body))
    assert body == expected


async def test_missing_or_invalid_video_does_not_publish_audio(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(stream, "TEMP_PATH", str(tmp_path))
    video = tmp_path / "invalid.mp4"
    missing = await MediaStream.stream_audio_from_video_async(
        video_path=str(video), range_header=None
    )
    assert missing.is_not_ok()
    video.write_bytes(b"invalid video")
    invalid = await MediaStream.stream_audio_from_video_async(
        video_path=str(video), range_header=None
    )
    assert invalid.is_not_ok()
    assert list((tmp_path / "video-audio").glob("*")) == []
