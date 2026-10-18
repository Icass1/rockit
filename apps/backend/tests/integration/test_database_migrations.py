from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine
from unittest.mock import patch
import pytest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from backend.core.access.db import migrations

pytestmark = pytest.mark.integration


async def test_migrations_upgrade_old_locations_once_and_keep_legacy_bytes_out_of_scope(
    database: AsyncSession,
) -> None:
    engine = database.bind
    assert isinstance(engine, AsyncEngine)
    await database.commit()
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE core.image DROP COLUMN storage_object_id"))
        await conn.execute(
            text(
                "ALTER TABLE core.image ADD COLUMN path VARCHAR NOT NULL DEFAULT 'legacy.jpg'"
            )
        )
    await migrations.apply_migrations_async(engine=engine)
    await migrations.apply_migrations_async(engine=engine)
    async with engine.connect() as conn:
        rows = (
            (
                await conn.execute(
                    text(
                        "SELECT version FROM core.database_migrations ORDER BY version"
                    )
                )
            )
            .scalars()
            .all()
        )
        assert rows == [1, 2]
        legacy = (
            await conn.execute(
                text("SELECT path,storage_object_id FROM core.image WHERE id=1")
            )
        ).one()
        assert legacy == ("legacy.jpg", None)
        assert (
            await conn.execute(
                text(
                    "SELECT is_nullable FROM information_schema.columns WHERE table_schema='core' AND table_name='image' AND column_name='path'"
                )
            )
        ).scalar_one() == "YES"


async def test_failed_migration_rolls_back_schema_and_history(
    database: AsyncSession,
) -> None:
    engine = database.bind
    assert isinstance(engine, AsyncEngine)
    await database.commit()
    success = migrations.Migration(
        1000, "success", ("CREATE TABLE core.migration_probe(id INTEGER)",)
    )
    failure = migrations.Migration(
        1001,
        "failure",
        (
            "CREATE TABLE core.should_rollback(id INTEGER)",
            "SELECT missing_migration_function()",
        ),
    )
    with patch.object(migrations, "MIGRATIONS", (success,)):
        await migrations.apply_migrations_async(engine=engine)
        await migrations.apply_migrations_async(engine=engine)
    with patch.object(migrations, "MIGRATIONS", (failure,)), pytest.raises(
        SQLAlchemyError
    ):
        await migrations.apply_migrations_async(engine=engine)
    async with engine.connect() as conn:
        assert (
            await conn.execute(
                text("SELECT count(*) FROM core.database_migrations WHERE version=1000")
            )
        ).scalar_one() == 1
        assert (
            await conn.execute(text("SELECT to_regclass('core.should_rollback')"))
        ).scalar_one() is None
        assert (
            await conn.execute(
                text("SELECT count(*) FROM core.database_migrations WHERE version=1001")
            )
        ).scalar_one() == 0


async def test_database_startup_creates_triggers_and_is_repeatable(
    database: AsyncSession,
) -> None:
    import asyncio
    from backend.core.access.db.database import Database

    engine = database.bind
    assert isinstance(engine, AsyncEngine)
    await database.commit()
    db = object.__new__(Database)
    db.engine = engine
    await asyncio.wait_for(db.async_init(), timeout=20)
    await asyncio.wait_for(db.async_init(), timeout=20)
    assert db.SessionLocal is not None
