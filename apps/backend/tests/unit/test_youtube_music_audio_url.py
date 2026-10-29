"""Legacy playback references resolve to S3 through the existing storage helper."""

from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.storageObject import StorageObjectRow
from core.framework.storage import Storage
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from result import Result, ResultCode
from youtubeMusic.access.db.ormModels.track import TrackRow
from youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess
from youtubeMusic.controllers.youtubeMusicController import get_youtube_music_audio_async
from youtubeMusic.framework.youtubeMusic import YoutubeMusic

pytestmark = pytest.mark.unit


async def test_legacy_audio_redirect_uses_the_registered_object_and_storage_helper(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    obj = StorageObjectRow(bucket="fixture", key="youtubeMusic/source.mp3")
    track = cast(TrackRow, SimpleNamespace(storage_object=obj))
    lookup = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=track))
    monkeypatch.setattr(YoutubeMusicAccess, "get_track_by_public_id_async", lookup)
    url = "https://objects.example/fixture/youtubeMusic/source.mp3?signature=test"
    resolve = Mock(return_value=url)
    monkeypatch.setattr(Storage, "get_public_url", resolve)
    session = AsyncMock(spec=AsyncSession)
    monkeypatch.setattr(DBSessionMiddleware, "get_session", Mock(return_value=session))
    response = await get_youtube_music_audio_async(
        request=Request({"type": "http"}), public_id="public-song"
    )
    assert response.status_code == 307
    assert response.headers["location"] == url
    assert response.headers["cache-control"] == "no-store"
    assert response.body == b""
    lookup.assert_awaited_once_with(session=session, public_id="public-song")
    resolve.assert_called_once_with(obj)


async def test_missing_audio_is_not_redirected_or_downloaded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    track = cast(TrackRow, SimpleNamespace(storage_object=None))
    monkeypatch.setattr(
        YoutubeMusicAccess,
        "get_track_by_public_id_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=track)),
    )
    resolve = Mock()
    monkeypatch.setattr(Storage, "get_public_url", resolve)
    result = await YoutubeMusic.get_audio_url_async(
        session=AsyncMock(spec=AsyncSession), public_id="missing"
    )
    assert result.code() == ResultCode.NOT_FOUND
    resolve.assert_not_called()


@pytest.mark.parametrize(
    "code,expected_status", [(ResultCode.NOT_FOUND, 404), (ResultCode.GENERAL_ERROR, 500)]
)
async def test_lookup_failure_preserves_http_error(
    monkeypatch: pytest.MonkeyPatch,
    code: int,
    expected_status: int,
) -> None:
    monkeypatch.setattr(
        YoutubeMusic,
        "get_audio_url_async",
        AsyncMock(return_value=Result(code=code, message="unavailable")),
    )
    monkeypatch.setattr(
        DBSessionMiddleware, "get_session", Mock(return_value=AsyncMock(spec=AsyncSession))
    )
    with pytest.raises(HTTPException) as error:
        await get_youtube_music_audio_async(request=Request({"type": "http"}), public_id="missing")
    assert error.value.status_code == expected_status
