"""Empty provider replies are unavailable metadata, not index errors."""

from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.mediaAccess import MediaAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework import providers
from core.framework.media.media import Media
from result import Result, ResultCode


@pytest.mark.parametrize(
    "kind,method",
    [
        (MediaTypeEnum.SONG, "get_songs_async"),
        (MediaTypeEnum.ARTIST, "get_artists_async"),
        (MediaTypeEnum.VIDEO, "get_videos_async"),
        (MediaTypeEnum.RADIO, "get_stations_async"),
    ],
)
async def test_empty_provider_result_is_not_found(
    monkeypatch: pytest.MonkeyPatch, kind: MediaTypeEnum, method: str
) -> None:
    row = SimpleNamespace(provider_id=1, media_type_key=kind.value)
    monkeypatch.setattr(
        MediaAccess,
        "get_media_from_public_id_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=row)),
    )
    provider = SimpleNamespace(
        **{method: AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=[]))}
    )
    monkeypatch.setattr(providers, "find_media_provider", lambda _: provider)
    response = await Media.get_media_async(
        session=cast(AsyncSession, object()), public_id="missing"
    )
    assert response.code() == ResultCode.NOT_FOUND
