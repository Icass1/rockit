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


# Each application owns its forward-only migration history. ORM metadata creates
# the current schema for new databases; add migrations here for deployed databases.
MIGRATIONS: tuple[Migration, ...] = (
    Migration(
        version=1,
        name="adopt_template_event_notifications",
        statements=(
            "ALTER TABLE core.notification ADD COLUMN IF NOT EXISTS vocabulary_key VARCHAR;",
            "ALTER TABLE core.notification ADD COLUMN IF NOT EXISTS replacements JSONB;",
            "ALTER TABLE core.notification ADD COLUMN IF NOT EXISTS destination JSONB;",
            "ALTER TABLE core.notification ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;",
            "ALTER TABLE core.notification ADD COLUMN IF NOT EXISTS source_key VARCHAR;",
            (
                "DO $$ BEGIN\n"
                "IF EXISTS (SELECT 1 FROM information_schema.columns WHERE "
                "table_schema='core' AND table_name='notification' AND "
                "column_name='message') THEN\n"
                "    CREATE TABLE IF NOT EXISTS core.notification_legacy_archive AS TABLE "
                "core.notification;\n"
                "    UPDATE core.notification SET\n"
                "        source_key = event_key,\n"
                "        vocabulary_key = CASE message_key\n"
                "            WHEN 'NOTIFICATIONS_DOWNLOAD_DONE' THEN "
                "'NOTIFICATION_DOWNLOAD_COMPLETED'\n"
                "            WHEN 'NOTIFICATIONS_DOWNLOAD_FAILED' THEN "
                "'NOTIFICATION_DOWNLOAD_FAILED'\n"
                "            WHEN 'NOTIFICATIONS_IMPORT_DONE' THEN "
                "'NOTIFICATION_IMPORT_COMPLETED'\n"
                "            WHEN 'NOTIFICATIONS_IMPORT_FAILED' THEN "
                "'NOTIFICATION_IMPORT_FAILED'\n"
                "            WHEN 'NOTIFICATIONS_ZIP_READY' THEN 'NOTIFICATION_ZIP_READY'\n"
                "            ELSE 'NOTIFICATION_LEGACY_MESSAGE' END,\n"
                "        replacements = CASE WHEN message_key IN "
                "('NOTIFICATIONS_DOWNLOAD_DONE','NOTIFICATIONS_DOWNLOAD_FAILED','NOTIFICATIONS_IMPORT_DONE','NOTIFICATIONS_IMPORT_FAILED','NOTIFICATIONS_ZIP_READY')\n"
                "            THEN "
                "jsonb_build_array(jsonb_build_object('key','TITLE','value',"
                "COALESCE(detail,'')))\n"
                "            ELSE "
                "jsonb_build_array(jsonb_build_object('key','MESSAGE','value',"
                "COALESCE(NULLIF(message,''),message_key,'')), "
                "jsonb_build_object('key','DETAIL','value',COALESCE(detail,''))) END,\n"
                "        read_at = CASE WHEN read THEN date_updated ELSE NULL END;\n"
                "    ALTER TABLE core.notification DROP CONSTRAINT IF EXISTS "
                "uq_notification_user_event;\n"
                "    ALTER TABLE core.notification DROP COLUMN type, DROP COLUMN category, "
                "DROP COLUMN message,\n"
                "        DROP COLUMN message_key, DROP COLUMN detail, DROP COLUMN "
                "detail_key, DROP COLUMN read;\n"
                "END IF;\n"
                "END $$;"
            ),
            "ALTER TABLE core.notification ALTER COLUMN vocabulary_key SET NOT NULL;",
            "ALTER TABLE core.notification ALTER COLUMN replacements SET NOT NULL;",
            (
                "DO $$ BEGIN\n"
                "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE "
                "conname='notification_user_source_uq' AND "
                "conrelid='core.notification'::regclass) THEN\n"
                "    ALTER TABLE core.notification ADD CONSTRAINT "
                "notification_user_source_uq UNIQUE(user_id,source_key);\n"
                "END IF;\n"
                "END $$;"
            ),
            (
                "CREATE INDEX IF NOT EXISTS notification_user_date_idx ON "
                "core.notification(user_id,date_added,id);"
            ),
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
            for statement in migration.statements:
                await conn.execute(text(statement))
            await conn.execute(
                text(
                    "INSERT INTO core.database_migrations (version, name) VALUES (:version, :name)"
                ),
                {"version": migration.version, "name": migration.name},
            )
