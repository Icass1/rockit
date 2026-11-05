"""Verify recommendation signals and ordering against PostgreSQL."""

import hashlib
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import insert, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.migrations import MIGRATIONS
from core.access.db.shared_metadata import shared_metadata
from core.access.recommendationAccess import RecommendationAccess
from core.access.userLikedMediaAccess import UserLikedMediaAccess

pytestmark = pytest.mark.integration


@pytest.fixture
async def catalogue(database: AsyncSession) -> AsyncSession:
    media = shared_metadata.tables["core.media"]
    await database.execute(
        insert(media),
        [dict(id=i, public_id=f"song-{i}", provider_id=2, media_type_key=4) for i in range(10, 16)]
        + [dict(id=20, public_id="album-20", provider_id=2, media_type_key=2)]
        + [dict(id=30, public_id="playlist-30", provider_id=1, media_type_key=3)],
    )
    await database.execute(
        insert(shared_metadata.tables["rockit.album"]),
        dict(id=20, name="Album", release_date="2026", image_id=1),
    )
    await database.execute(
        insert(shared_metadata.tables["rockit.song"]),
        [
            dict(
                id=i,
                name=f"Song {i}",
                duration_ms=1000,
                storage_object_id=1,
                image_id=1,
                album_id=20 if i in (10, 11) else None,
                disc_number=1,
                track_number=i,
            )
            for i in range(10, 16)
        ],
    )
    await database.execute(
        insert(shared_metadata.tables["default_schema.playlist"]),
        dict(id=30, name="Playlist", owner_id=1, image_id=1, is_public=True),
    )
    await database.execute(
        insert(shared_metadata.tables["default_schema.playlist_media"]),
        [
            dict(playlist_id=30, media_id=i, position=position)
            for position, i in enumerate((10, 12))
        ],
    )
    now = datetime.now(tz=UTC)
    await database.execute(
        insert(shared_metadata.tables["core.user_media_listened"]),
        [
            dict(user_id=1, media_id=10, date_added=now - timedelta(minutes=10)),
            dict(user_id=1, media_id=13, date_added=now),
            dict(user_id=1, media_id=13, date_added=now - timedelta(days=2)),
            dict(user_id=1, media_id=14, date_added=now - timedelta(days=30)),
            dict(user_id=2, media_id=13, date_added=now),
        ],
    )
    await database.commit()
    return database


async def test_candidates_keep_signals_and_apply_exclusions_before_limit(
    catalogue: AsyncSession,
) -> None:
    result = await RecommendationAccess.get_local_candidates_async(
        session=catalogue, seed_media_ids=[10, 10], exclude_media_ids=[], limit=10, user_id=1
    )
    assert result.is_ok(), result.info()
    songs = {song.media_id: song for song in result.result()}
    assert set(songs) == {11, 12, 13}
    assert songs[11].same_album and songs[11].album_key == "album-20"
    assert songs[12].playlist_co == 1
    assert songs[13].session_co == 1
    assert songs[13].play_count == 3
    assert songs[13].recent_user_plays == 2
    assert [song.media_id for song in result.result()] == [12, 13, 11]

    limited = await RecommendationAccess.get_local_candidates_async(
        session=catalogue, seed_media_ids=[10], exclude_media_ids=[12], limit=1, user_id=1
    )
    assert limited.is_ok(), limited.info()
    assert [song.media_id for song in limited.result()] == [13]
    assert limited.result()[0].play_count == 3


@pytest.mark.parametrize("rotation_key", ["", "user-1:rotation"])
async def test_fallback_preserves_popularity_and_rotation_order(
    catalogue: AsyncSession, rotation_key: str
) -> None:
    result = await RecommendationAccess.get_fallback_candidates_async(
        session=catalogue, exclude_media_ids=[10], limit=2, rotation_key=rotation_key
    )
    assert result.is_ok(), result.info()
    expected = (
        sorted(
            range(11, 16),
            key=lambda i: hashlib.md5(f"song-{i}{rotation_key}".encode()).hexdigest(),
        )[:2]
        if rotation_key
        else [13, 14]
    )
    assert [song.media_id for song in result.result()] == expected
    play_counts = {11: 0, 12: 0, 13: 3, 14: 1, 15: 0}
    assert [song.play_count for song in result.result()] == [play_counts[i] for i in expected]


async def test_liked_seed_limit_preserves_unbounded_default(catalogue: AsyncSession) -> None:
    now = datetime.now(tz=UTC)
    await catalogue.execute(
        insert(shared_metadata.tables["core.user_liked_media"]),
        [dict(user_id=1, media_id=i, date_added=now + timedelta(seconds=i)) for i in range(10, 16)],
    )
    limited = await UserLikedMediaAccess.get_user_liked_media_public_ids_async(
        session=catalogue, user_id=1, limit=2
    )
    all_likes = await UserLikedMediaAccess.get_user_liked_media_public_ids_async(
        session=catalogue, user_id=1
    )
    assert limited.is_ok() and all_likes.is_ok()
    assert limited.result() == ["song-15", "song-14"]
    assert len(all_likes.result()) == 6


async def test_jit_override_expires_at_transaction_boundary(catalogue: AsyncSession) -> None:
    await catalogue.execute(text("SET jit = on"))
    await catalogue.commit()
    result = await RecommendationAccess.get_local_candidates_async(
        session=catalogue, seed_media_ids=[10], exclude_media_ids=[], limit=2, user_id=1
    )
    assert result.is_ok(), result.info()
    assert await catalogue.scalar(text("SHOW jit")) == "off"
    await catalogue.commit()
    assert await catalogue.scalar(text("SHOW jit")) == "on"


async def test_migration_adds_missing_indexes_to_existing_tables(database: AsyncSession) -> None:
    migration = next(item for item in MIGRATIONS if item.name == "index_recommendation_candidates")
    indexes = [
        index
        for table in shared_metadata.tables.values()
        for index in table.indexes
        if index.name and index.name.startswith("ix_recommendation_")
    ]
    for index in indexes:
        assert index.table is not None
        await database.execute(text(f'DROP INDEX "{index.table.schema}"."{index.name}"'))
    for _ in range(2):
        for statement in migration.statements:
            await database.execute(text(statement))
    for index in indexes:
        assert index.table is not None
        exists = await database.scalar(
            text("SELECT to_regclass(:name)"),
            dict(name=f"{index.table.schema}.{index.name}"),
        )
        assert exists is not None
