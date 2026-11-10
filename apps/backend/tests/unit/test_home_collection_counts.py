"""Home summaries use batched full-graph counts, independent of loaded children."""

from typing import Any
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.collectionAccess import CollectionAccess
from core.access.recommendationAccess import RecommendationAccess
from core.access.statsAccess import StatsAccess
from core.access.userLikedMediaAccess import UserLikedMediaAccess
from core.framework.media.media import Media
from core.framework.stats import Stats
from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.basePlaylistWithMediasResponse import BasePlaylistWithMediasResponse
from core.responses.mediaResponse import MediaResponse
from result import Result, ResultCode


@pytest.mark.parametrize("failed", [False, True])
async def test_home_populates_playable_counts_without_changing_pagination(
    monkeypatch: pytest.MonkeyPatch,
    failed: bool,
) -> None:
    for name in [
        "get_recently_played_songs_async",
        "get_random_songs_last_month_async",
        "get_top_media_public_ids_async",
        "get_least_recently_played_songs_async",
        "get_recently_played_songs_since_async",
    ]:
        monkeypatch.setattr(StatsAccess, name, AsyncMock(return_value=Result[list[str]].ok([])))
    monkeypatch.setattr(
        StatsAccess, "get_summary_async", AsyncMock(return_value=Result[dict[str, Any]].ok({}))
    )
    monkeypatch.setattr(
        StatsAccess, "get_current_streak_async", AsyncMock(return_value=Result[int].ok(0))
    )
    for name in ["get_community_top_song_ids_async", "get_mood_song_ids_async"]:
        monkeypatch.setattr(
            RecommendationAccess, name, AsyncMock(return_value=Result[list[str]].ok([]))
        )
    monkeypatch.setattr(
        UserLikedMediaAccess,
        "get_user_liked_media_public_ids_async",
        AsyncMock(return_value=Result[list[str]].ok([])),
    )
    monkeypatch.setattr(
        Media, "get_medias_from_public_ids_async", AsyncMock(return_value=Result[list[str]].ok([]))
    )
    monkeypatch.setattr(Media, "resolve_songs_from_public_ids_async", AsyncMock(return_value=[]))
    monkeypatch.setattr(
        StatsAccess,
        "get_recently_clicked_media_public_ids_async",
        AsyncMock(return_value=Result[list[str]].ok(["playlist", "album"])),
    )
    common = dict(provider="Test", providerUrl="", imageUrl="", name="Collection")
    playlist = BasePlaylistWithMediasResponse.model_validate(
        dict(
            **common,
            publicId="playlist",
            url="/playlist/playlist",
            description=None,
            owner=dict(**common, publicId="owner", url="/user/owner", dominantColor=""),
            contributors=[],
            medias=[],
            total=3,
        )
    )
    album = BaseAlbumWithSongsResponse.model_validate(
        dict(
            **common,
            publicId="album",
            url="/album/album",
            artists=[],
            releaseDate="",
            dominantColor="",
            songs=[],
            total=2,
        )
    )
    monkeypatch.setattr(
        Media,
        "get_media_async",
        AsyncMock(
            side_effect=[
                Result[MediaResponse].ok(MediaResponse(media=playlist)),
                Result[MediaResponse].ok(MediaResponse(media=album)),
            ]
        ),
    )
    counts = AsyncMock(
        return_value=(
            Result[dict[str, int]](code=ResultCode.GENERAL_ERROR, message="Count unavailable")
            if failed
            else Result[dict[str, int]].ok({"playlist": 7, "album": 2})
        )
    )
    monkeypatch.setattr(CollectionAccess, "playable_counts_async", counts)
    session = AsyncMock(spec=AsyncSession)
    result = await Stats.get_home_stats_async(session=session, user_id=42)
    counts.assert_awaited_once_with(session=session, public_ids=["playlist", "album"], user_id=42)
    if failed:
        assert result.is_not_ok() and result.message() == "Count unavailable"
    else:
        assert result.is_ok(), result.info()
        assert [
            item.media.playableCount
            for item in result.result().recentlyClickedMedia
            if isinstance(item.media, (BaseAlbumWithSongsResponse, BasePlaylistWithMediasResponse))
        ] == [7, 2]
        assert playlist.medias == [] and playlist.total == 3
        assert album.songs == [] and album.total == 2
