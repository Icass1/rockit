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


def _storage_reference_statements(
    schema: str,
    table: str,
    legacy_column: str | None,
    nullable: bool,
) -> tuple[str, ...]:
    """Backfill existing S3 keys, refusing to drop a key without a registered object."""
    qualified = f'"{schema}"."{table}"'
    backfill = ""
    if legacy_column is not None:
        backfill = f"""
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = '{schema}' AND table_name = '{table}'
                     AND column_name = '{legacy_column}') THEN
            UPDATE {qualified} AS media SET storage_object_id = object.id
            FROM core.storage_object AS object
            WHERE media.storage_object_id IS NULL AND object.key = media."{legacy_column}";
            IF EXISTS (SELECT 1 FROM {qualified}
                       WHERE "{legacy_column}" IS NOT NULL AND storage_object_id IS NULL) THEN
                RAISE EXCEPTION 'Unregistered storage key in {schema}.{table}';
            END IF;
            ALTER TABLE {qualified} DROP COLUMN "{legacy_column}";
        END IF;
        """
    elif table == "app_version":
        backfill = f"""
        UPDATE {qualified} AS media SET storage_object_id = object.id
        FROM core.storage_object AS object
        WHERE media.storage_object_id IS NULL AND object.key = 'builds/' || media.apk_filename;
        """
    required = (
        ""
        if nullable
        else f"""
        IF EXISTS (SELECT 1 FROM {qualified} WHERE storage_object_id IS NULL) THEN
            RAISE EXCEPTION 'Missing storage object for {schema}.{table}';
        END IF;
        ALTER TABLE {qualified} ALTER COLUMN storage_object_id SET NOT NULL;
    """
    )
    return (
        f"ALTER TABLE {qualified} ADD COLUMN IF NOT EXISTS storage_object_id INTEGER",
        f"""DO $migration$ BEGIN
            {backfill}
            {required}
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint AS constraint_row
                JOIN pg_attribute AS attribute ON attribute.attrelid = constraint_row.conrelid
                    AND attribute.attname = 'storage_object_id'
                WHERE constraint_row.conrelid = '{schema}.{table}'::regclass
                  AND constraint_row.contype = 'f'
                  AND constraint_row.confrelid = 'core.storage_object'::regclass
                  AND constraint_row.conkey = ARRAY[attribute.attnum]
            ) THEN
                ALTER TABLE {qualified} ADD CONSTRAINT "fk_{schema}_{table}_storage_object"
                    FOREIGN KEY (storage_object_id) REFERENCES core.storage_object(id);
            END IF;
        END $migration$""",
    )


STORED_MEDIA_TABLES: tuple[tuple[str, str, str, bool], ...] = (
    ("spotify", "track", "path", True),
    ("spotify_scrapper", "track", "path", True),
    ("youtube_music", "track", "path", True),
    ("youtube", "video", "video_path", True),
    ("rockit", "song", "file_path", False),
    ("rockit", "video", "file_path", False),
)

MIGRATIONS: tuple[Migration, ...] = (
    Migration(
        version=1,
        name="reference_storage_objects_from_media_and_builds",
        statements=(
            *tuple(
                statement
                for arguments in STORED_MEDIA_TABLES
                for statement in _storage_reference_statements(*arguments)
            ),
            *_storage_reference_statements("core", "app_version", None, False),
            # Old local assembly sessions cannot resume as S3 multipart uploads.
            """DO $migration$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'core' AND table_name = 'build_upload_session'
                      AND column_name = 'file_path') THEN
                    DELETE FROM core.build_upload_session;
                    ALTER TABLE core.build_upload_session DROP COLUMN file_path;
                END IF;
            END $migration$""",
            "ALTER TABLE core.build_upload_session "
            "ADD COLUMN IF NOT EXISTS multipart_upload_id VARCHAR",
            "ALTER TABLE core.build_upload_session ALTER COLUMN multipart_upload_id SET NOT NULL",
            *_storage_reference_statements("core", "build_upload_session", None, False),
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
