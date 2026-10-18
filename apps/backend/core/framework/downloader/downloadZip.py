from backend.core.framework.storage import Storage
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
import os
import re
import asyncio
import tempfile
import zipfile
from logging import Logger
from typing import List, Set, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import TEMP_PATH
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.utils.safeAsyncCall import safe_async

from backend.core.access.downloadZipAccess import DownloadZipAccess

from backend.core.framework.downloader.downloader import Downloader

logger: Logger = getLogger(name=__name__)

# Upper bound for a single archive. The browser holds the whole response in
# memory before saving it, so an unbounded library ZIP would kill the tab.
MAX_ZIP_BYTES: int = 2 * 1024 * 1024 * 1024


def _safe_name(value: str) -> str:
    """Strip path separators and reserved characters from an archive entry name."""

    return re.sub(r'[\\/:*?"<>|]', "_", value).strip() or "media"


def _build_archive(zip_path: str, files: List[Tuple[str, str]]) -> int:
    """Write the given files into zip_path. Blocking, must run off the event loop."""

    used_names: Set[str] = set()
    written: int = 0

    # Audio and video files are already compressed, so deflating them burns CPU
    # for no meaningful size gain.
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, file_path in files:
            if not os.path.isfile(file_path):
                logger.warning(f"Skipping missing file while zipping. {file_path}")
                continue

            archive_name = f"{_safe_name(name)}{os.path.splitext(file_path)[1]}"
            stem, extension = os.path.splitext(archive_name)
            suffix = 2
            while archive_name in used_names:
                archive_name = f"{stem} ({suffix}){extension}"
                suffix += 1

            used_names.add(archive_name)
            archive.write(file_path, archive_name)
            written += 1

    return written


def _remove_quietly(path: str) -> None:
    """Delete a temporary file, ignoring the case where it is already gone."""

    try:
        os.unlink(path)
    except OSError as exception:
        logger.warning(f"Could not remove temporary ZIP. {path} {exception}")


class DownloadZip:
    @staticmethod
    @safe_async
    async def create_async(
        session: AsyncSession,
        user_id: int,
        public_ids: List[str],
        title: str,
    ) -> AResult[str]:
        """Expand containers, package downloaded files and return a temporary ZIP path."""

        a_result_containers: AResult[List[str]] = (
            await DownloadZipAccess.get_container_public_ids_async(
                session=session, public_ids=public_ids
            )
        )
        if a_result_containers.is_not_ok():
            logger.error(
                f"Error resolving containers. {a_result_containers.info()}",
                exc_info=True,
            )
            return AResult(
                code=a_result_containers.code(), message=a_result_containers.message()
            )

        container_ids: Set[str] = set(a_result_containers.result())
        expanded_ids: List[str] = []
        for public_id in public_ids:
            if public_id not in container_ids:
                expanded_ids.append(public_id)
                continue

            a_result_expanded: AResult[List[str]] = (
                await Downloader.expand_container_async(
                    session=session, public_id=public_id, user_id=user_id
                )
            )
            if a_result_expanded.is_not_ok():
                logger.warning(
                    f"Could not expand container {public_id}. "
                    f"{a_result_expanded.info()}"
                )
                continue

            expanded_ids.extend(a_result_expanded.result())

        a_result_files: AResult[List[Tuple[str, StorageObjectRow]]] = (
            await DownloadZipAccess.get_file_paths_async(
                session=session, public_ids=list(dict.fromkeys(expanded_ids))
            )
        )
        if a_result_files.is_not_ok():
            logger.error(
                f"Error getting file paths. {a_result_files.info()}", exc_info=True
            )
            return AResult(code=a_result_files.code(), message=a_result_files.message())

        sources = a_result_files.result()
        if not sources:
            logger.warning("No downloaded files found")
            return AResult(
                code=AResultCode.NOT_FOUND, message="No downloaded files found"
            )
        if sum(obj.size_bytes for _, obj in sources) > MAX_ZIP_BYTES:
            logger.warning("ZIP selection is too large")
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Selection is too large to download as a ZIP",
            )
        os.makedirs(TEMP_PATH, exist_ok=True)
        fd, zip_path = tempfile.mkstemp(prefix="rockit-", suffix=".zip", dir=TEMP_PATH)
        os.close(fd)
        files: List[Tuple[str, str]] = []
        try:
            for name, obj in sources:
                local = await Storage.materialize_async(storage_object=obj)
                if local.is_not_ok():
                    logger.error(local.info())
                    _remove_quietly(path=zip_path)
                    return AResult(code=local.code(), message=local.message())
                files.append((name, local.result()))
            written = await asyncio.to_thread(
                _build_archive, zip_path=zip_path, files=files
            )
            if written == 0:
                _remove_quietly(path=zip_path)
                logger.warning("No files available for ZIP")
                return AResult(
                    code=AResultCode.NOT_FOUND, message="No downloaded files found"
                )
            return AResult(code=AResultCode.OK, message="OK", result=zip_path)
        except Exception:
            _remove_quietly(path=zip_path)
            logger.exception("Could not create ZIP")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Could not create ZIP"
            )
        finally:
            for _, path in files:
                _remove_quietly(path=path)
