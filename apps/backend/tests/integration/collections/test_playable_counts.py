"""Count full collection graphs against PostgreSQL rather than loaded UI pages."""

import os
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
from sqlalchemy import Column, Integer, MetaData, String, Table, or_, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.sql import ColumnElement
from sqlalchemy.sql.selectable import CTE

from core.access import collectionAccess
from core.access.collectionAccess import CollectionAccess

pytestmark = pytest.mark.integration


@pytest.fixture
async def collection_database(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncEngine]:
    url = os.environ.get("ROCKIT_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set ROCKIT_TEST_DATABASE_URL to a dedicated PostgreSQL test server")
    name = f"rockit_test_{uuid4().hex}"
    admin = create_async_engine(url, isolation_level="AUTOCOMMIT")
    async with admin.connect() as conn:
        await conn.execute(text(f'CREATE DATABASE "{name}"'))
    engine = create_async_engine(make_url(url).set(database=name))
    metadata = MetaData(schema="core")
    media = Table(
        "media",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("public_id", String),
        Column("media_type_key", Integer),
        Column("owner_id", Integer),
    )
    edges = Table(
        "test_membership",
        metadata,
        Column("parent_id", Integer),
        Column("media_id", Integer),
    )

    def test_edges(user_id: int) -> CTE:
        return select(edges).cte("collection_edges")

    def test_visibility(user_id: int) -> ColumnElement[bool]:
        return or_(media.c.owner_id.is_(None), media.c.owner_id == user_id)

    monkeypatch.setattr(collectionAccess, "shared_metadata", metadata)
    monkeypatch.setattr(CollectionAccess, "_edges", staticmethod(test_edges))
    monkeypatch.setattr(CollectionAccess, "_visible", staticmethod(test_visibility))
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE SCHEMA core"))
            await conn.run_sync(metadata.create_all)
            await conn.execute(
                media.insert(),
                [
                    dict(id=id_, public_id=str(id_), media_type_key=type_, owner_id=owner)
                    for id_, type_, owner in [
                        (1, 3, 42),
                        (2, 2, None),
                        (3, 3, 42),
                        (4, 3, None),
                        (5, 4, None),
                        (6, 4, None),
                        (7, 5, None),
                        (8, 6, None),
                        (9, 1, None),
                        (10, 3, 99),
                        (11, 4, 99),
                    ]
                ],
            )
            await conn.execute(
                edges.insert(),
                [
                    dict(parent_id=parent, media_id=child)
                    for parent, child in [
                        (1, 2),
                        (1, 2),
                        (1, 3),
                        (1, 5),
                        (1, 9),
                        (1, 10),
                        (1, 11),
                        (2, 5),
                        (2, 6),
                        (3, 1),
                        (3, 7),
                        (3, 8),
                        (10, 5),
                    ]
                ],
            )
        yield engine
    finally:
        await engine.dispose()
        async with admin.connect() as conn:
            await conn.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
        await admin.dispose()


async def test_counts_include_nested_playable_occurrences_and_respect_visibility(
    collection_database: AsyncEngine,
) -> None:
    async with AsyncSession(collection_database) as session:
        result = await CollectionAccess.playable_counts_async(
            session=session, public_ids=["1", "2", "4", "10", "missing"], user_id=42
        )
    assert result.is_ok(), result.info()
    # Two copies of a two-song album, one direct song, one nested video and station.
    # A cycle back to the root, an artist and another user's private media add nothing.
    assert result.result() == {"1": 7, "2": 2, "4": 0}
