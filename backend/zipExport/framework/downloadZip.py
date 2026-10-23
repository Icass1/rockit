import os
import asyncio
import tempfile
from logging import Logger
from typing import List, Set

from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import TEMP_PATH
from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id

from backend.core.aResult import AResult, AResultCode

from backend.core.utils.safeAsyncCall import safe_async

from backend.core.access.notificationAccess import NotificationAccess
from backend.core.framework.downloader.downloader import Downloader
from backend.zipExport.access.downloadZipAccess import DownloadZipAccess
from backend.zipExport.models.exportFile import ExportFile
from backend.zipExport.utils.archive import ArchiveTooLarge, build_archive

logger: Logger = getLogger(name=__name__)

# Upper bound for a single archive. The browser holds the whole response in
# memory before saving it, so an unbounded library ZIP would kill the tab.
MAX_ZIP_BYTES: int = 2 * 1024 * 1024 * 1024


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
        for public_id in dict.fromkeys(public_ids):
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

        a_result_files: AResult[list[ExportFile]] = (
            await DownloadZipAccess.get_export_files_async(
                session=session, public_ids=list(dict.fromkeys(expanded_ids))
            )
        )
        if a_result_files.is_not_ok():
            logger.error(
                f"Error getting file paths. {a_result_files.info()}", exc_info=True
            )
            return AResult(code=a_result_files.code(), message=a_result_files.message())

        files: list[ExportFile] = a_result_files.result()
        if not files:
            logger.warning(f"No downloaded files found for ZIP '{title}'")
            return AResult(
                code=AResultCode.NOT_FOUND, message="No downloaded files found"
            )

        os.makedirs(TEMP_PATH, exist_ok=True)
        fd, zip_path = tempfile.mkstemp(prefix="rockit-", suffix=".zip", dir=TEMP_PATH)
        os.close(fd)

        try:
            worker = asyncio.create_task(
                asyncio.to_thread(
                    build_archive,
                    zip_path=zip_path,
                    files=files,
                    max_bytes=MAX_ZIP_BYTES,
                )
            )
            try:
                written: int = await asyncio.shield(worker)
            except asyncio.CancelledError:
                # A running thread cannot be cancelled. Clean up after it has closed the ZIP.
                def discard(task: asyncio.Task[int]) -> None:
                    try:
                        task.result()
                    except (Exception, asyncio.CancelledError):
                        pass
                    _remove_quietly(path=zip_path)

                worker.add_done_callback(discard)
                raise
        except ArchiveTooLarge:
            logger.warning(f"ZIP '{title}' exceeds the limit after embedding metadata")
            _remove_quietly(path=zip_path)
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Selection is too large to download as a ZIP. Select fewer items.",
            )
        except Exception as exception:
            logger.error(f"Error writing ZIP file. {exception}", exc_info=True)
            _remove_quietly(path=zip_path)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error creating ZIP file"
            )

        if written == 0:
            logger.warning(f"Every file vanished while building ZIP '{title}'")
            _remove_quietly(path=zip_path)
            return AResult(
                code=AResultCode.NOT_FOUND, message="No downloaded files found"
            )

        try:
            notification = await NotificationAccess.create_async(
                session=session,
                user_id=user_id,
                event_key=f"zip:{create_id(32)}",
                type=3,
                category="download",
                message_key="NOTIFICATIONS_ZIP_READY",
                detail=title[:2000],
            )
        except asyncio.CancelledError:
            _remove_quietly(path=zip_path)
            raise
        if notification.is_not_ok():
            logger.error(f"ZIP notification failed: {notification.info()}")
        return AResult(code=AResultCode.OK, message="OK", result=zip_path)
