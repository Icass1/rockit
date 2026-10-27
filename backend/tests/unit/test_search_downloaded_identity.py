"""Search availability must identify the exact local recording, not just its title."""

from unittest.mock import AsyncMock
from typing import cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.spotifyScrapper.framework.provider import spotifyScrapperProvider as module

pytestmark = pytest.mark.unit


async def test_search_resolves_downloaded_recording_in_one_batch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    items = [
        BaseSearchResultsItem(
            type="song",
            name="Same title",
            providerUrl=f"https://open.spotify.com/track/{key}",
            imageUrl="",
            artists=[],
            provider="source",
            downloaded=False,
            url=None,
        )
        for key in ["downloaded", "other-edition"]
    ]
    monkeypatch.setattr(
        module.SpotifyScrapper,
        "search_async",
        AsyncMock(
            return_value=AResult(code=AResultCode.OK, message="OK", result=items)
        ),
    )
    lookup = AsyncMock(
        return_value=AResult(
            code=AResultCode.OK, message="OK", result={"downloaded": "local-public-id"}
        )
    )
    monkeypatch.setattr(
        module.SpotifyScrapperAccess, "get_downloaded_search_ids_async", lookup
    )
    session = cast(AsyncSession, AsyncMock())
    response = await module.SpotifyScrapperProvider().search_page_async(
        session=session, query="Same title"
    )
    assert response.is_ok()
    songs = response.result()
    assert songs[0].downloaded is True
    assert songs[0].publicId == "local-public-id"
    assert songs[1].downloaded is False
    assert songs[1].publicId is None
    lookup.assert_awaited_once_with(
        session=session, spotify_ids=["downloaded", "other-edition"]
    )
