"""Each integration test owns a disposable PostgreSQL database, never deployment data."""

import os
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from sqlalchemy import insert, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine


@pytest.fixture
async def database(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncSession]:
    url = os.environ.get("ROCKIT_TEST_DATABASE_URL")
    if not url:
        pytest.skip(
            "Set ROCKIT_TEST_DATABASE_URL to a PostgreSQL admin URL for disposable test databases"
        )
    from importlib import import_module

    import_module("core.framework.websocket")
    from core.access.collectionAccess import shared_metadata
    from core.framework import providers
    from default.framework.provider.defaultProvider import DefaultProvider
    from rockit.framework.provider.rockitProvider import RockItProvider

    name = f"rockit_test_{uuid4().hex}"
    admin = create_async_engine(url, isolation_level="AUTOCOMMIT")
    async with admin.connect() as conn:
        await conn.execute(text(f'CREATE DATABASE "{name}"'))
    engine = create_async_engine(make_url(url).set(database=name))
    try:
        async with engine.begin() as conn:
            for schema in sorted({t.schema for t in shared_metadata.tables.values() if t.schema}):
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
                insert(shared_metadata.tables["core.storage_object"]),
                dict(id=1, public_id="storage-test", bucket="test", key="test"),
            )
            await session.execute(
                insert(shared_metadata.tables["core.image"]),
                dict(id=1, public_id="image", storage_object_id=1, dominant_color="#000000"),
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
