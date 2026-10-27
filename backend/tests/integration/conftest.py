"""Each integration test owns a disposable PostgreSQL database, never deployment data."""

import os
from uuid import uuid4
from importlib import import_module
from collections.abc import AsyncIterator

import pytest
from sqlalchemy import text, insert
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.engine import make_url

from backend.core.access.collectionAccess import shared_metadata
from backend.core.framework import providers

# Initialize websocket handlers before providers to resolve their shared imports.
import_module(name="backend.core.framework.websocket")
from backend.default.framework.provider.defaultProvider import DefaultProvider
from backend.rockit.framework.provider.rockitProvider import RockItProvider


@pytest.fixture
async def database(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncSession]:
    url = os.environ.get("ROCKIT_TEST_DATABASE_URL")
    if not url:
        pytest.skip(
            "Set ROCKIT_TEST_DATABASE_URL to a PostgreSQL admin URL for disposable test databases"
        )
    name = f"rockit_test_{uuid4().hex}"
    admin = create_async_engine(url, isolation_level="AUTOCOMMIT")
    async with admin.connect() as conn:
        await conn.execute(text(f'CREATE DATABASE "{name}"'))
    engine = create_async_engine(make_url(url).set(database=name))
    try:
        async with engine.begin() as conn:
            for schema in sorted(
                {t.schema for t in shared_metadata.tables.values() if t.schema}
            ):
                await conn.execute(text(f'CREATE SCHEMA "{schema}"'))
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            await conn.run_sync(shared_metadata.create_all)
        async with AsyncSession(engine, expire_on_commit=False) as session:
            for enum in [
                "media_type_enum",
                "queue_type_enum",
                "repeat_mode_enum",
                "playlist_contributor_role_enum",
            ]:
                table = shared_metadata.tables[f"core.{enum}"]
                await session.execute(
                    insert(table), [dict(key=i, value=str(i)) for i in range(1, 7)]
                )
            await session.execute(
                insert(shared_metadata.tables["core.provider"]),
                [
                    dict(id=1, name="Default", module="default"),
                    dict(id=2, name="RockIt", module="rockit"),
                ],
            )
            await session.execute(
                insert(shared_metadata.tables["core.image"]),
                dict(id=1, public_id="image", path="test", dominant_color="#000000"),
            )
            await session.execute(
                insert(shared_metadata.tables["core.language"]),
                dict(id=1, lang_code="en", language="English"),
            )
            await session.execute(
                insert(shared_metadata.tables["core.user"]),
                [
                    dict(id=i, public_id=f"user-{i}", username=f"user-{i}", image_id=1)
                    for i in (1, 2)
                ],
            )
            await session.commit()
            default, rockit = DefaultProvider(), RockItProvider()
            default.set_info(provider_id=1, provider_name="Default")
            rockit.set_info(provider_id=2, provider_name="RockIt")
            monkeypatch.setattr(providers, "_providers", [default, rockit])
            yield session
    finally:
        await engine.dispose()
        async with admin.connect() as conn:
            await conn.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
        await admin.dispose()


@pytest.fixture
async def large_playlist(database: AsyncSession) -> AsyncSession:
    session = database
    tables = shared_metadata.tables
    await session.execute(
        insert(tables["core.media"]),
        [
            dict(id=i, public_id=f"list-{i}", provider_id=1, media_type_key=3)
            for i in (10, 11, 12)
        ],
    )
    await session.execute(
        insert(tables["default_schema.playlist"]),
        [
            dict(id=i, name=f"List {i}", image_id=1, owner_id=1, is_public=i != 12)
            for i in (10, 11, 12)
        ],
    )
    await session.execute(
        insert(tables["core.media"]),
        dict(id=20, public_id="album", provider_id=2, media_type_key=2),
    )
    await session.execute(
        insert(tables["rockit.album"]),
        dict(id=20, name="Album", image_id=1, release_date="2026"),
    )
    songs = range(1000, 6000)
    await session.execute(
        insert(tables["core.media"]),
        [
            dict(id=i, public_id=f"song-{i}", provider_id=2, media_type_key=4)
            for i in songs
        ],
    )
    await session.execute(
        insert(tables["rockit.song"]),
        [
            dict(
                id=i,
                name=f"Track {i}" if i != 5999 else "Needle 100%_exact",
                duration_ms=1000,
                file_path=f"{i}.mp3",
                image_id=1,
                album_id=20 if i >= 5990 else None,
                disc_number=1,
                track_number=i - 5989 if i >= 5990 else i - 999,
            )
            for i in songs
        ],
    )
    await session.execute(
        insert(tables["default_schema.playlist_media"]),
        [
            dict(playlist_id=10, media_id=i, position=i - 1000)
            for i in range(1000, 5990)
        ],
    )
    await session.execute(
        insert(tables["default_schema.playlist_media"]),
        [
            dict(playlist_id=10, media_id=20, position=4990),
            dict(playlist_id=10, media_id=11, position=4991),
            dict(playlist_id=11, media_id=10, position=0),
            dict(playlist_id=11, media_id=1000, position=1),
            dict(playlist_id=10, media_id=12, position=4992),
            dict(playlist_id=12, media_id=1001, position=0),
        ],
    )
    await session.commit()
    return session
