import argparse
import asyncio
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from tqdm import tqdm

from logger import getLogger

logger = getLogger(__name__)

parser = argparse.ArgumentParser()
parser.add_argument("--env", type=str, help="Path to env file to load")
parser.add_argument(
    "--lrc-lib-path",
    type=str,
    default="../lrclib-db-dump-20260519T172012Z.sqlite3",
    help="Path to LRCLIB SQLite dump",
)
parser.add_argument(
    "--db",
    type=str,
    default="database.db",
    help="Path to the legacy SQLite database.db",
)
parser.add_argument(
    "--user-id",
    type=int,
    help="User ID used by commands that operate on one user",
)
parser.add_argument("command", nargs="?", help="Command to run")
args, _ = parser.parse_known_args()
command_to_run = args.command if args.command else ""

if args.env:
    if not os.path.exists(args.env):
        print(f"Env file not found: {args.env}")
        sys.exit(1)
    print(f"Loading {args.env}...")
    os.environ["ROCKIT_ENV_FILE"] = args.env


async def import_vocabulary(persist: bool = True) -> None:
    """Generate vocabulary artifacts and optionally import the workbook into the DB."""

    types_path = Path("packages/shared/src/models/types/vocabulary.ts")

    try:
        import openpyxl
    except ImportError:
        logger.error("openpyxl is required. Install with: pip install openpyxl")
        return

    file_path = os.path.join("Vocabulary.xlsx")

    if not os.path.exists(file_path):
        logger.error(f"Vocabulary.xlsx not found at {file_path}")
        return

    logger.info(f"Reading vocabulary from {file_path}")

    workbook = openpyxl.load_workbook(file_path, data_only=True)
    sheet = workbook.active
    if sheet is None:
        logger.error("No active sheet found in workbook")
        workbook.close()
        return

    first_row: list[Any] = [cell.value for cell in sheet[1]]
    logger.info(f"Found columns: {first_row}")

    language_columns: list[str] = [str(h) for h in first_row[1:] if h is not None]
    logger.info(f"Found languages: {language_columns}")

    second_row: list[Any] = [cell.value for cell in sheet[2]]

    if not second_row or second_row[0] is None:
        logger.error("First column must be 'KEY'")
        return

    if second_row[0] != "KEY":
        logger.error("First column must be 'KEY'")
        return

    language_code_columns: list[str] = [str(h) for h in second_row[1:] if h is not None]
    logger.info(f"Found languages codes: {language_code_columns}")

    types_content: list[str] = [
        "// This file is generated using: python3 -m backend import_vocabulary",
        "// Do not modify this file manually.",
        "",
        "export interface Vocabulary {",
    ]

    vocabulary_data: dict[str, dict[str, str]] = {lang: {} for lang in language_code_columns}
    all_keys: list[str] = []

    max_row: int = sheet.max_row or 0
    for row_idx in range(3, max_row + 1):
        key_cell = sheet.cell(row=row_idx, column=1).value
        if not key_cell:
            continue

        if not isinstance(key_cell, str):
            logger.warning(f"{key_cell} is not a number")
            continue

        all_keys.append(str(key_cell))

        if key_cell.startswith(" ") or key_cell.endswith(" "):
            logger.critical(f"Traling spaces detected in key '{key_cell}'")

        types_content.append(f"    {key_cell}: string;")

        for col_idx, lang_code in enumerate(language_code_columns, start=2):
            value = sheet.cell(row=row_idx, column=col_idx).value
            if value:
                vocabulary_data[lang_code][str(key_cell)] = str(value)

    types_content.append("}")
    types_content.append("")
    types_path.write_text("\n".join(types_content))

    friends_defaults_path = Path("apps/web/lib/generated/friendsVocabulary.json")
    # Include common actions and level names used by the Friends surface.
    friends_keys = {"NEWCOMER", "EXPLORER", "ENTHUSIAST", "CONNOISSEUR", "LEGEND"}
    for component in Path("apps/web/components/Friends").glob("*.tsx"):
        friends_keys.update(re.findall(r"\bv\.([A-Z][A-Z_0-9]+)", component.read_text()))
    friends_defaults = {
        lang: {
            key: value
            for key, value in translations.items()
            if key.startswith(("FRIENDS_", "SOCIAL_")) or key in friends_keys
        }
        for lang, translations in vocabulary_data.items()
    }
    friends_defaults_path.write_text(
        json.dumps(friends_defaults, ensure_ascii=False, indent=4) + "\n",
        encoding="utf-8",
    )
    workbook.close()
    logger.info(f"Found {len(all_keys)} vocabulary keys")
    if not persist:
        return

    from core.access.db import db_context

    async with db_context.session_scope_async() as session:
        from core.framework.language import Language
        from core.framework.models.vocabulary import VocabularyImportData
        from core.framework.vocabulary import Vocabulary

        for lang_name, lang_code in zip(language_columns, language_code_columns):
            a_result = await Language.get_or_create_language(
                session=session, lang_code=lang_code, language=lang_name
            )
            if a_result.is_ok():
                logger.info(f"Language {lang_code} ready")
            else:
                logger.error(f"Error with language {lang_code}: {a_result.message()}")

        import_data = VocabularyImportData(vocabulary=vocabulary_data)
        a_result_import = await Vocabulary.import_vocabulary_from_dict(
            session=session, vocabulary_data=import_data
        )
        if a_result_import.is_ok():
            logger.info("Vocabulary imported successfully")
        else:
            logger.error(f"Error importing vocabulary: {a_result_import.message()}")

        a_result_cleanup = await Vocabulary.remove_keys_not_in_import(
            session=session, valid_keys=all_keys
        )
        if a_result_cleanup.is_ok():
            logger.info("Cleanup completed")
        else:
            logger.error(f"Error during cleanup: {a_result_cleanup.message()}")

    workbook.close()
    logger.info("Import complete!")


async def migrate_media_listened_to_intervals_async(user_id: int) -> None:
    """Copy historical completed listens into full-media listen intervals."""
    from sqlalchemy import func, select

    from core.access.db import db_context
    from core.access.db.ormModels.media import CoreMediaRow
    from core.access.db.ormModels.user_media_listen_interval import (
        UserMediaListenIntervalRow,
    )
    from core.access.db.ormModels.user_media_listened import (
        UserMediaListenedRow,
    )
    from core.framework import providers

    async with db_context.session_scope_async() as session:
        await providers.async_init(session=session)

        oldest_interval_date = await session.scalar(
            select(func.min(UserMediaListenIntervalRow.date_added)).where(
                UserMediaListenIntervalRow.user_id == user_id
            )
        )
        if oldest_interval_date is None:
            logger.error(
                f"No listen interval exists for user {user_id}; cannot determine "
                f"the migration cutoff"
            )
            return

        logger.info(f"Using oldest interval date {oldest_interval_date}")

        listened_rows = (
            await session.execute(
                select(UserMediaListenedRow, CoreMediaRow)
                .join(
                    CoreMediaRow,
                    CoreMediaRow.id == UserMediaListenedRow.media_id,
                )
                .where(
                    UserMediaListenedRow.user_id == user_id,
                    UserMediaListenedRow.date_added < oldest_interval_date,
                )
                .order_by(UserMediaListenedRow.date_added)
            )
        ).all()

        if not listened_rows:
            logger.info(
                f"No user_media_listened rows before {oldest_interval_date} for user {user_id}"
            )
            return

        migrated_count = 0
        skipped_count = 0
        for listened, media in tqdm(listened_rows, desc="Migrating listened media", unit="media"):
            provider = providers.find_media_provider(media.provider_id)
            if provider is None:
                logger.error(
                    f"No provider found for media {media.id} "
                    f"(provider_id={media.provider_id}); skipping"
                )
                skipped_count += 1
                continue

            a_result_duration = await provider.get_media_duration_ms_async(
                session=session,
                public_id=media.public_id,
            )
            if a_result_duration.is_not_ok():
                logger.error(
                    f"Error getting duration for media {media.public_id}. "
                    f"{a_result_duration.info()}"
                )
                skipped_count += 1
                continue

            duration_ms = a_result_duration.result()
            if duration_ms <= 0:
                logger.error(
                    f"Invalid duration for media {media.public_id}: {duration_ms}; skipping"
                )
                skipped_count += 1
                continue

            interval = UserMediaListenIntervalRow(
                user_id=user_id,
                media_id=media.id,
                time_ms_start=0,
                time_ms_end=duration_ms,
            )
            interval.date_added = listened.date_added
            logger.debug(
                f"Added {interval.user_id=} {interval.media_id=} "
                f"{interval.time_ms_end=} {interval.date_added}"
            )
            session.add(interval)
            migrated_count += 1

        await session.commit()
        logger.info(
            f"Migrated {migrated_count} listens for user {user_id}; skipped {skipped_count}"
        )


async def main() -> None:
    if command_to_run == "generate-vocabulary":
        await import_vocabulary(persist=False)
        return

    from core import add_initial_content_async
    from core.access.db import db_context

    # Only init DB for commands that need it.
    needs_db: bool = command_to_run not in ["models"]
    if needs_db:
        try:
            await db_context.async_init()
        except Exception as e:
            logger.critical(f"Error initializing database: {e}")
            sys.exit()

        await db_context.wait_for_session_local_async()

    first_loop = True

    def run_input(prompt: str) -> str:
        return input(prompt)

    with ThreadPoolExecutor(max_workers=1) as executor:
        while True:
            command: str
            if first_loop and command_to_run != "":
                command = command_to_run
                first_loop = False
            else:
                try:
                    future = executor.submit(run_input, "> ")
                    command = future.result()
                except KeyboardInterrupt:
                    break

            if command == "exit":
                break

            elif command == "reinit":
                await db_context.reinit()

            elif command == "models":
                from core.utils.addInit import add_init_to_orm
                from core.utils.enumGenerator import generate_enum_schemas
                from core.utils.httpMethodsGenerator import http_methods_generator
                from core.utils.zodGenerator import generate_zod_schemas

                add_init_to_orm()
                await http_methods_generator()
                await generate_zod_schemas()
                await generate_enum_schemas()

            elif command == "import-vocabulary":
                await import_vocabulary()

            elif command == "init-db":
                if hasattr(db_context, "engine"):
                    await db_context.engine.dispose()
                await db_context.async_init()

                await add_initial_content_async()

                logger.info("Database initialized")

            elif command.startswith("migrate-media-listened-to-interval"):
                parts = command.split()
                user_id = args.user_id
                for i, part in enumerate(parts):
                    if part == "--user-id" and i + 1 < len(parts):
                        user_id = int(parts[i + 1])

                if user_id is None:
                    logger.error("Usage: migrate-media-listened-to-interval --user-id <int>")
                    continue

                await migrate_media_listened_to_intervals_async(user_id=user_id)

            elif command == "update-video-durations":
                from core.framework.objectFiles import ObjectFiles
                from youtube.access.videoAccess import VideoAccess

                try:
                    import ffmpeg  # type: ignore
                except ImportError:
                    logger.error(
                        "ffmpeg-python is required. Install with: pip install ffmpeg-python"
                    )
                    continue

                async with db_context.session_scope_async() as session:
                    a_result = await VideoAccess.get_all_videos_async(session=session)
                    if a_result.is_not_ok():
                        logger.error(f"Error getting videos: {a_result.message()}")
                        continue

                    videos = a_result.result()
                    logger.info(f"Found {len(videos)} videos")

                    updated_count = 0
                    error_count = 0

                    for video in videos:
                        if not video.storage_object:
                            logger.warning(f"Video {video.id} has no video_path, skipping")
                            error_count += 1
                            continue

                        try:
                            async with ObjectFiles.local_copy_async(
                                video.storage_object.key
                            ) as full_path:
                                probe = await asyncio.to_thread(ffmpeg.probe, full_path)  # type: ignore

                            video_info = next(  # type: ignore
                                s
                                for s in probe["streams"]  # type: ignore
                                if s["codec_type"] == "video"  # type: ignore
                            )
                            # type: ignore
                            duration = float(probe["format"]["duration"])  # type: ignore

                            real_duration = int(
                                float(video_info.get("duration", duration)) * 1000  # type: ignore
                            )

                            video.duration_ms = int(duration * 1000)
                            video.real_duration_ms = real_duration

                            await session.commit()
                            logger.info(
                                f"Updated video {video.id}: duration={video.duration_ms}, "
                                f"real_duration={video.real_duration_ms}"
                            )
                            updated_count += 1
                        except Exception as e:
                            logger.error(f"Error processing {video.id}: {e}")
                            error_count += 1

                    logger.info(f"Updated {updated_count} videos, {error_count} errors")

            elif command.startswith("migrate-playlist"):
                from migratePlaylist import migrate_playlist_async

                parts = command.split()
                sqlite_db = "database.db"
                playlist_id = ""
                user_id = 0

                for i, part in enumerate(parts):
                    if part == "--db" and i + 1 < len(parts):
                        sqlite_db = parts[i + 1]
                    elif part == "--playlist-id" and i + 1 < len(parts):
                        playlist_id = parts[i + 1]
                    elif part == "--user-id" and i + 1 < len(parts):
                        user_id = int(parts[i + 1])

                if not playlist_id or not user_id:
                    logger.error(
                        "Usage: migrate-playlist --playlist-id <id> --user-id <int> [--db <path>]"
                    )
                    continue

                await migrate_playlist_async(
                    sqlite_path=sqlite_db,
                    playlist_id=playlist_id,
                    target_user_id=user_id,
                )

            elif command == "import-lrc-lib":
                from lrclib.framework.importLrcLib import (
                    import_lrc_lib_from_dump_async,
                )

                lrc_lib_path = args.lrc_lib_path
                if not os.path.exists(lrc_lib_path):
                    logger.error(f"LRCLIB SQLite dump not found: {lrc_lib_path}")
                    continue

                async with db_context.session_scope_async() as session:
                    await import_lrc_lib_from_dump_async(
                        sqlite_path=lrc_lib_path,
                        session=session,
                    )

            else:
                print("Command not found.")

            if command_to_run != "":
                break

    print("Bye!")


if __name__ == "__main__":
    asyncio.run(main=main())
