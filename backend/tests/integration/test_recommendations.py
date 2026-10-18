from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import httpx
import pytest
from sqlalchemy import insert, update, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.collectionAccess import shared_metadata
from backend.core.access.recommendationAccess import RecommendationAccess
from backend.core.framework.recommendation import Recommendation
from backend.core.framework.localRecommendation import LocalRecommendation

pytestmark = pytest.mark.integration


@pytest.fixture(autouse=True)
def clear_recommendation_cache() -> None:
    Recommendation.candidates.clear()
    Recommendation.shown.clear()


@pytest.fixture
async def music(database: AsyncSession) -> AsyncSession:
    tables = shared_metadata.tables
    await database.execute(
        insert(tables["core.media"]),
        [
            dict(id=100, public_id="album", provider_id=2, media_type_key=2),
            dict(id=200, public_id="artist-a", provider_id=2, media_type_key=1),
            dict(id=201, public_id="artist-b", provider_id=2, media_type_key=1),
            *[
                dict(id=i, public_id=f"song-{i}", provider_id=2, media_type_key=4)
                for i in range(1000, 1006)
            ],
        ],
    )
    await database.execute(
        insert(tables["rockit.album"]),
        dict(id=100, name="Album", image_id=1, release_date="2026"),
    )
    await database.execute(
        insert(tables["rockit.artist"]),
        [
            dict(id=200, name="Artist A", image_id=1),
            dict(id=201, name="Artist B", image_id=1),
        ],
    )
    await database.execute(
        insert(tables["rockit.song"]),
        [
            dict(
                id=i,
                name=f"Track {i}",
                duration_ms=180000,
                file_path=f"{i}.mp3" if i != 1005 else "",
                image_id=1,
                album_id=100 if i in (1000, 1002) else None,
                disc_number=1,
                track_number=i - 999,
            )
            for i in range(1000, 1006)
        ],
    )
    await database.execute(
        insert(tables["rockit.song_artists"]),
        [
            dict(song_id=i, artist_id=200 if i in (1000, 1002) else 201)
            for i in range(1000, 1005)
        ],
    )
    await database.execute(
        insert(tables["core.user_liked_media"]),
        [dict(user_id=1, media_id=1000), dict(user_id=2, media_id=1003)],
    )
    now = datetime.now(timezone.utc)
    await database.execute(
        insert(tables["core.user_media_listened"]),
        [
            dict(user_id=1, media_id=1000, date_added=now - timedelta(hours=1)),
            dict(user_id=2, media_id=1003, date_added=now - timedelta(hours=2)),
        ],
    )
    await database.execute(
        insert(tables["core.user_library_media"]), dict(user_id=1, media_id=1004)
    )
    await database.execute(
        insert(tables["core.user_queue"]),
        dict(user_id=1, media_id=1001, queue_id=40, sorted_index=0, random_index=0),
    )
    await database.execute(
        update(tables["core.user"])
        .where(tables["core.user"].c.id == 1)
        .values(current_queue_id=40)
    )
    await database.commit()
    return database


async def test_stored_signals_are_personal_and_bounded(music: AsyncSession) -> None:
    first = await RecommendationAccess.candidates_async(session=music, user_id=1)
    second = await RecommendationAccess.candidates_async(session=music, user_id=2)
    assert first.is_ok() and second.is_ok()
    a = {c.public_id: c for c in first.result()}
    b = {c.public_id: c for c in second.result()}
    assert a["song-1000"].liked and not b["song-1000"].liked
    assert a["song-1001"].current and not b["song-1001"].current
    assert a["song-1004"].in_library and not b["song-1004"].in_library
    assert a["song-1002"].album == "Album"
    assert a["song-1002"].artists == ("Artist A",)
    assert not a["song-1005"].playable
    assert LocalRecommendation.rank(candidates=first.result())[0] == "song-1002"
    assert LocalRecommendation.rank(candidates=second.result())[0] != "song-1002"
    bounded = await RecommendationAccess.candidates_async(
        session=music, user_id=1, limit=2
    )
    assert bounded.is_ok() and len(bounded.result()) == 2


async def test_recommendations_hydrate_existing_playable_models_without_network_or_downloads(
    music: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    network = AsyncMock(
        side_effect=AssertionError("Local recommendations must never call HTTP")
    )
    monkeypatch.setattr(httpx.AsyncClient, "send", network)
    result = await Recommendation.get_async(session=music, user_id=1)
    assert result.is_ok()
    response = result.result()
    assert response.provider == "local"
    assert response.songs[0].publicId == "song-1002"
    assert response.songs[0].artists[0].publicId == "artist-a"
    assert response.songs[0].album.publicId == "album"
    assert all(
        s.audioUrl == f"http://test/rockit/audio/{s.publicId}" and s.downloaded
        for s in response.songs
    )
    assert not {"song-1000", "song-1001", "song-1005"}.intersection(
        s.publicId for s in response.songs
    )
    assert (
        await music.execute(
            select(func.count()).select_from(shared_metadata.tables["core.download"])
        )
    ).scalar() == 0
    network.assert_not_awaited()


async def test_empty_instance_returns_success_without_history(
    database: AsyncSession,
) -> None:
    result = await Recommendation.get_async(session=database, user_id=1)
    assert result.is_ok()
    assert result.result().songs == []
