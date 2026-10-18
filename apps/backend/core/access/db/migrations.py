"""Versioned database migrations."""

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from backend.utils.logger import getLogger

logger = getLogger(__name__)


@dataclass(frozen=True)
class Migration:
    """Describe one forward-only database migration."""

    version: int
    name: str
    statements: tuple[str, ...]


# Each application owns its forward-only migration history. ORM metadata creates
# the current schema for new databases; add migrations here for deployed databases.
_STORAGE_MIGRATIONS: tuple[Migration, ...] = (
    Migration(
        version=1,
        name="add_storage_references",
        statements=(
            "ALTER TABLE core.image ADD COLUMN IF NOT EXISTS storage_object_id INTEGER REFERENCES core.storage_object(id)",
            "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='image' AND column_name='path') THEN ALTER TABLE core.image ALTER COLUMN path DROP NOT NULL; END IF; END $$",
            "ALTER TABLE spotify.track ADD COLUMN IF NOT EXISTS storage_object_id INTEGER REFERENCES core.storage_object(id)",
            "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='spotify' AND table_name='track' AND column_name='path') THEN ALTER TABLE spotify.track ALTER COLUMN path DROP NOT NULL; END IF; END $$",
            "ALTER TABLE spotify_scrapper.track ADD COLUMN IF NOT EXISTS storage_object_id INTEGER REFERENCES core.storage_object(id)",
            "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='spotify_scrapper' AND table_name='track' AND column_name='path') THEN ALTER TABLE spotify_scrapper.track ALTER COLUMN path DROP NOT NULL; END IF; END $$",
            "ALTER TABLE youtube_music.track ADD COLUMN IF NOT EXISTS storage_object_id INTEGER REFERENCES core.storage_object(id)",
            "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='youtube_music' AND table_name='track' AND column_name='path') THEN ALTER TABLE youtube_music.track ALTER COLUMN path DROP NOT NULL; END IF; END $$",
            "ALTER TABLE youtube.video ADD COLUMN IF NOT EXISTS storage_object_id INTEGER REFERENCES core.storage_object(id)",
            "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='youtube' AND table_name='video' AND column_name='video_path') THEN ALTER TABLE youtube.video ALTER COLUMN video_path DROP NOT NULL; END IF; END $$",
            "ALTER TABLE rockit.song ADD COLUMN IF NOT EXISTS storage_object_id INTEGER REFERENCES core.storage_object(id)",
            "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rockit' AND table_name='song' AND column_name='file_path') THEN ALTER TABLE rockit.song ALTER COLUMN file_path DROP NOT NULL; END IF; END $$",
            "ALTER TABLE rockit.video ADD COLUMN IF NOT EXISTS storage_object_id INTEGER REFERENCES core.storage_object(id)",
            "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rockit' AND table_name='video' AND column_name='file_path') THEN ALTER TABLE rockit.video ALTER COLUMN file_path DROP NOT NULL; END IF; END $$",
            "ALTER TABLE core.app_version ADD COLUMN IF NOT EXISTS storage_object_id INTEGER REFERENCES core.storage_object(id)",
            "ALTER TABLE core.build_upload_session ADD COLUMN IF NOT EXISTS storage_object_id INTEGER REFERENCES core.storage_object(id)",
            "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='core' AND table_name='build_upload_session' AND column_name='file_path') THEN ALTER TABLE core.build_upload_session ALTER COLUMN file_path DROP NOT NULL; END IF; END $$",
            "ALTER TABLE core.build_upload_session ADD COLUMN IF NOT EXISTS total_size BIGINT NOT NULL DEFAULT 0",
        ),
    ),
)

MIGRATIONS = _STORAGE_MIGRATIONS + (
    Migration(
        version=2,
        name="add_creator_attribution",
        statements=(
            "ALTER TABLE core.app_version ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.app_version'::regclass AND conname='app_version_added_by_fk') THEN ALTER TABLE core.app_version ADD CONSTRAINT app_version_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.bookmark ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.bookmark'::regclass AND conname='bookmark_added_by_fk') THEN ALTER TABLE core.bookmark ADD CONSTRAINT bookmark_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.build_upload_session ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.build_upload_session'::regclass AND conname='build_upload_session_added_by_fk') THEN ALTER TABLE core.build_upload_session ADD CONSTRAINT build_upload_session_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.download ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.download'::regclass AND conname='download_added_by_fk') THEN ALTER TABLE core.download ADD CONSTRAINT download_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.download_group ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.download_group'::regclass AND conname='download_group_added_by_fk') THEN ALTER TABLE core.download_group ADD CONSTRAINT download_group_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.image ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.image'::regclass AND conname='image_added_by_fk') THEN ALTER TABLE core.image ADD CONSTRAINT image_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.media ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.media'::regclass AND conname='media_added_by_fk') THEN ALTER TABLE core.media ADD CONSTRAINT media_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.pending_upload ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.pending_upload'::regclass AND conname='pending_upload_added_by_fk') THEN ALTER TABLE core.pending_upload ADD CONSTRAINT pending_upload_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.user ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.user'::regclass AND conname='user_added_by_fk') THEN ALTER TABLE core.user ADD CONSTRAINT user_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.user_request ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.user_request'::regclass AND conname='user_request_added_by_fk') THEN ALTER TABLE core.user_request ADD CONSTRAINT user_request_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.notification ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.notification'::regclass AND conname='notification_added_by_fk') THEN ALTER TABLE core.notification ADD CONSTRAINT notification_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE core.storage_object ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='core.storage_object'::regclass AND conname='storage_object_added_by_fk') THEN ALTER TABLE core.storage_object ADD CONSTRAINT storage_object_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE lrclib.lyrics ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='lrclib.lyrics'::regclass AND conname='lyrics_added_by_fk') THEN ALTER TABLE lrclib.lyrics ADD CONSTRAINT lyrics_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE spotify.external_image ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='spotify.external_image'::regclass AND conname='external_image_added_by_fk') THEN ALTER TABLE spotify.external_image ADD CONSTRAINT external_image_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE spotify_scrapper.external_image ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='spotify_scrapper.external_image'::regclass AND conname='external_image_added_by_fk') THEN ALTER TABLE spotify_scrapper.external_image ADD CONSTRAINT external_image_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
            "ALTER TABLE youtube.external_image ADD COLUMN IF NOT EXISTS added_by INTEGER",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='youtube.external_image'::regclass AND conname='external_image_added_by_fk') THEN ALTER TABLE youtube.external_image ADD CONSTRAINT external_image_added_by_fk FOREIGN KEY (added_by) REFERENCES core.user(id) ON DELETE SET NULL; END IF; END $$",
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
