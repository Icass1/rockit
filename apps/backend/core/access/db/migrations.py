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


MIGRATIONS: tuple[Migration, ...] = (
    Migration(
        version=1,
        name="remove_notification_source_key",
        statements=(
            "ALTER TABLE IF EXISTS core.notification "
            "DROP CONSTRAINT IF EXISTS notification_user_source_uq",
            "ALTER TABLE IF EXISTS core.notification DROP COLUMN IF EXISTS source_key",
        ),
    ),
    Migration(
        version=2,
        name="add_user_listening_heatmap_preference",
        statements=(
            'ALTER TABLE core."user" ADD COLUMN IF NOT EXISTS '
            "show_listening_heatmap BOOLEAN NOT NULL DEFAULT TRUE",
        ),
    ),
    Migration(
        version=3,
        name="add_user_theme_preference",
        statements=(
            'ALTER TABLE core."user" ADD COLUMN IF NOT EXISTS '
            "theme VARCHAR(16) NOT NULL DEFAULT 'dark'",
            'ALTER TABLE core."user" DROP CONSTRAINT IF EXISTS user_theme_check',
            'ALTER TABLE core."user" ADD CONSTRAINT user_theme_check '
            "CHECK (theme IN ('dark', 'light', 'system'))",
        ),
    ),
    Migration(
        version=4,
        name="index_recommendation_candidates",
        statements=(
            "CREATE INDEX IF NOT EXISTS ix_recommendation_listened_media_user_date "
            "ON core.user_media_listened (media_id, user_id, date_added)",
            "CREATE INDEX IF NOT EXISTS ix_recommendation_liked_user_date "
            "ON core.user_liked_media (user_id, date_added) INCLUDE (media_id)",
            "CREATE INDEX IF NOT EXISTS ix_recommendation_playlist_media_playlist "
            "ON default_schema.playlist_media (media_id, playlist_id)",
            "CREATE INDEX IF NOT EXISTS ix_recommendation_playlist_playlist_media "
            "ON default_schema.playlist_media (playlist_id, media_id)",
        ),
    ),
    Migration(
        version=5,
        name="persist_recording_content_ratings",
        statements=(
            "ALTER TABLE core.media ADD COLUMN IF NOT EXISTS is_explicit BOOLEAN",
            "ALTER TABLE core.media ADD COLUMN IF NOT EXISTS explicit_source VARCHAR(128)",
            "ALTER TABLE core.media ADD COLUMN IF NOT EXISTS "
            "explicit_manual BOOLEAN NOT NULL DEFAULT FALSE",
        ),
    ),
    Migration(
        version=6,
        name="unique_storage_object_original_key",
        statements=(
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint "
            "WHERE conrelid = 'core.storage_object'::regclass AND contype = 'u' "
            "AND conkey = ARRAY[(SELECT attnum FROM pg_attribute "
            "WHERE attrelid = 'core.storage_object'::regclass "
            "AND attname = 'original_key')]) THEN "
            "ALTER TABLE core.storage_object "
            "ADD CONSTRAINT storage_object_original_key_key UNIQUE (original_key); "
            "END IF; END $$",
        ),
    ),
)


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
