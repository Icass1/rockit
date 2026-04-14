import os
import sys
import asyncio
from pathlib import Path
from typing import Any, Dict, List
from concurrent.futures import ThreadPoolExecutor

from backend.utils.logger import getLogger

logger = getLogger(__name__)

command_to_run = sys.argv[1] if len(sys.argv) > 1 else ""


async def import_vocabulary() -> None:
    """Import vocabulary from Vocabulary.xlsx file."""
    from backend.core.access.db import rockit_db

    types_path = Path("frontend/packages/shared/src/models/types/vocabulary.ts")

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

    first_row: List[Any] = [cell.value for cell in sheet[1]]
    logger.info(f"Found columns: {first_row}")

    language_columns: List[str] = [str(h) for h in first_row[1:] if h is not None]
    logger.info(f"Found languages: {language_columns}")

    second_row: List[Any] = [cell.value for cell in sheet[2]]

    if not second_row or second_row[0] is None:
        logger.error("First column must be 'KEY'")
        return

    if second_row[0] != "KEY":
        logger.error("First column must be 'KEY'")
        return

    language_code_columns: List[str] = [str(h) for h in second_row[1:] if h is not None]
    logger.info(f"Found languages codes: {language_code_columns}")

    types_content: List[str] = [
        "// This file is generated using: python3 -m backend import_vocabulary",
        "// Do not modify this file manually.",
        "",
        "export interface Vocabulary {",
    ]

    vocabulary_data: Dict[str, Dict[str, str]] = {
        lang: {} for lang in language_code_columns
    }
    all_keys: List[str] = []

    max_row: int = sheet.max_row or 0
    for row_idx in range(3, max_row + 1):
        key_cell = sheet.cell(row=row_idx, column=1).value
        if not key_cell:
            continue

        if type(key_cell) != str:
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

    logger.info(f"Found {len(all_keys)} vocabulary keys")

    async with rockit_db.session_scope_async() as session:
        from backend.core.framework.language import Language
        from backend.core.framework.vocabulary import Vocabulary
        from backend.core.framework.models.vocabulary import VocabularyImportData

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


async def main() -> None:
    logger.info("Future CLI in progress")

    from backend.core.access.db import rockit_db

    await rockit_db.wait_for_session_local_async()

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
                await rockit_db.reinit()

            elif command == "zod":
                from backend.utils.zod_generator import generate_zod_schemas

                await generate_zod_schemas()

            elif command == "import-vocabulary":
                await import_vocabulary()

            elif command == "init-db":
                if hasattr(rockit_db, "engine"):
                    await rockit_db.engine.dispose()
                await rockit_db.async_init()
                logger.info("Database initialized")

            elif command == "cleanup-images":
                from backend.core.access.imageAccess import ImageAccess
                from backend.constants import IMAGES_PATH

                db_paths: set[str] = set()
                fs_paths: set[str] = set()

                async with rockit_db.session_scope_async() as session:
                    a_result = await ImageAccess.get_all_images_async(session=session)
                    if a_result.is_not_ok():
                        logger.error(f"Error getting images: {a_result.message()}")
                        continue

                    for img in a_result.result():
                        db_paths.add(img.path)

                logger.info(f"Found {len(db_paths)} images in database")

                for root, _, files in os.walk(IMAGES_PATH):
                    for file in files:
                        rel_path = os.path.relpath(
                            os.path.join(root, file), IMAGES_PATH
                        )
                        fs_paths.add(rel_path)

                logger.info(f"Found {len(fs_paths)} images in filesystem")

                extra_files = fs_paths - db_paths

                if not extra_files:
                    logger.info("No extra images to clean up")
                    continue

                logger.info(f"Extra images ({len(extra_files)}):")
                for path in sorted(extra_files):
                    logger.info(f"  - {path}")

                confirm = input("Delete these files? This cannot be undone (y/N): ")
                if confirm.lower() != "y":
                    logger.info("Cancelled")
                    continue

                deleted_count = 0
                for rel_path in extra_files:
                    full_path = os.path.join(IMAGES_PATH, rel_path)
                    try:
                        os.remove(full_path)
                        logger.info(f"Deleted: {rel_path}")
                        deleted_count += 1
                    except Exception as e:
                        logger.error(f"Error deleting {rel_path}: {e}")

                logger.info(f"Deleted {deleted_count} files")

            else:
                print("Command not found.")

            if command_to_run != "":
                break

    print("Bye!")


if __name__ == "__main__":
    import asyncio

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(main())
    except RuntimeError:
        asyncio.run(main())
