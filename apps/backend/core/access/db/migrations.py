"""Versioned database migrations."""

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from logger import logger


@dataclass(frozen=True)
class Migration:
    """Describe one forward-only database migration."""

    version: int
    name: str
    statements: tuple[str, ...]


MIGRATIONS: tuple[Migration, ...] = ()


def validate_migrations() -> None:
    """Validate migration metadata before the database can use it."""

    versions = [migration.version for migration in MIGRATIONS]
    if versions != sorted(set(versions)):
        raise ValueError("Database migrations must have unique, ascending versions")


validate_migrations()


async def apply_migrations_async(engine: AsyncEngine) -> None:
    """Apply each pending migration exactly once in version order.

    Migration execution and its history record share one transaction. A
    transaction-level advisory lock prevents two application processes
    from applying the same migration concurrently during startup.
    """

    async with engine.begin() as conn:
        await conn.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"),
            {"lock_key": "rockit-database-migrations"},
        )
        await conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS core.database_migrations ("
                "version INTEGER PRIMARY KEY, "
                "name VARCHAR NOT NULL, "
                "applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
                ")"
            )
        )
        applied_result = await conn.execute(
            text("SELECT version FROM core.database_migrations ORDER BY version")
        )
        applied_versions = {row[0] for row in applied_result}

        for migration in MIGRATIONS:
            if migration.version in applied_versions:
                continue

            logger.info(
                "Applying database migration %s: %s",
                migration.version,
                migration.name,
            )
            for statement_index, statement in enumerate(migration.statements, start=1):
                try:
                    await conn.execute(text(statement))
                except Exception as e:
                    logger.error(
                        f"Error applying database migration {migration.version} "
                        f"({migration.name}), statement {statement_index}: {e}",
                        exc_info=True,
                    )
                    raise

            await conn.execute(
                text(
                    "INSERT INTO core.database_migrations (version, name) VALUES (:version, :name)"
                ),
                {"version": migration.version, "name": migration.name},
            )
