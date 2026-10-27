import asyncio
import os
import tempfile
from dataclasses import replace
from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from constants import TEMP_PATH
from core.access.storageObjectAccess import StorageObjectAccess
from core.framework.downloader.downloader import Downloader
from core.framework.notification import ZIP_READY_NOTIFICATION, Notification
from core.framework.storage import Storage
from core.responses.notificationResponses import NotificationDestination, NotificationReplacement
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode
from zipExport.access.downloadZipAccess import DownloadZipAccess
from zipExport.models.exportFile import ExportFile
from zipExport.utils.archive import ArchiveTooLarge, build_archive
from zipExport.utils.audioMetadata import read_cover_bytes

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


async def _with_cover_data_async(
    session: AsyncSession, files: list[ExportFile]
) -> list[ExportFile]:
    """Download stored artwork once per image and attach it to export metadata."""

    resolved: list[ExportFile] = []
    cover_cache: dict[int, tuple[bytes, str] | None] = {}
    for item in files:
        tags = item.tags
        storage_object_id = tags.cover_storage_object_id if tags is not None else 0
        if tags is None or storage_object_id <= 0 or tags.cover_data is not None:
            resolved.append(item)
            continue

        if storage_object_id not in cover_cache:
            cover: tuple[bytes, str] | None = None
            a_result_object = await StorageObjectAccess.get_object_from_id_async(
                session=session, id=storage_object_id
            )
            if a_result_object.is_not_ok():
                logger.warning(
                    f"Error getting cover storage object {storage_object_id}. "
                    f"{a_result_object.info()}"
                )
            else:
                a_result_bytes = await Storage.download_bytes_async(
                    session=session, storage_object=a_result_object.result()
                )
                if a_result_bytes.is_not_ok():
                    logger.warning(
                        f"Error downloading cover object {storage_object_id}. "
                        f"{a_result_bytes.info()}"
                    )
                else:
                    cover = read_cover_bytes(
                        data=a_result_bytes.result(),
                        label=a_result_object.result().key,
                    )
            cover_cache[storage_object_id] = cover

        cover = cover_cache[storage_object_id]
        if cover is not None:
            tags = replace(tags, cover_data=cover[0], cover_mime=cover[1])
        resolved.append(replace(item, tags=tags))

    return resolved


class DownloadZip:
    @staticmethod
    @safe_async
    async def create_async(
        session: AsyncSession,
        user_id: int,
        public_ids: list[str],
        title: str,
    ) -> Result[str]:
        """Expand containers, package downloaded files and return a temporary ZIP path."""

        a_result_containers: Result[
            list[str]
        ] = await DownloadZipAccess.get_container_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_containers.is_not_ok():
            logger.error(
                f"Error resolving containers. {a_result_containers.info()}",
                exc_info=True,
            )
            return Result(code=a_result_containers.code(), message=a_result_containers.message())

        container_ids: set[str] = set(a_result_containers.result())
        expanded_ids: list[str] = []
        for public_id in dict.fromkeys(public_ids):
            if public_id not in container_ids:
                expanded_ids.append(public_id)
                continue

            a_result_expanded: Result[list[str]] = await Downloader.expand_container_async(
                session=session, public_id=public_id, user_id=user_id
            )
            if a_result_expanded.is_not_ok():
                logger.warning(
                    f"Could not expand container {public_id}. {a_result_expanded.info()}"
                )
                continue

            expanded_ids.extend(a_result_expanded.result())

        a_result_files: Result[list[ExportFile]] = await DownloadZipAccess.get_export_files_async(
            session=session, public_ids=list(dict.fromkeys(expanded_ids))
        )
        if a_result_files.is_not_ok():
            logger.error(f"Error getting file paths. {a_result_files.info()}", exc_info=True)
            return Result(code=a_result_files.code(), message=a_result_files.message())

        files: list[ExportFile] = a_result_files.result()
        if not files:
            logger.warning(f"No downloaded files found for ZIP '{title}'")
            return Result(code=ResultCode.NOT_FOUND, message="No downloaded files found")

        files = await _with_cover_data_async(session=session, files=files)

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
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Selection is too large to download as a ZIP. Select fewer items.",
            )
        except Exception as exception:
            logger.error(f"Error writing ZIP file. {exception}", exc_info=True)
            _remove_quietly(path=zip_path)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error creating ZIP file")

        if written == 0:
            logger.warning(f"Every file vanished while building ZIP '{title}'")
            _remove_quietly(path=zip_path)
            return Result(code=ResultCode.NOT_FOUND, message="No downloaded files found")

        try:
            notification = await Notification.emit_async(
                session,
                ZIP_READY_NOTIFICATION,
                [NotificationReplacement(key="TITLE", value=title[:2000])],
                NotificationDestination(path="/downloads"),
                recipient_user_id=user_id,
            )
        except asyncio.CancelledError:
            _remove_quietly(path=zip_path)
            raise
        if notification.is_not_ok():
            logger.error(f"ZIP notification failed: {notification.info()}")
        return Result(code=ResultCode.OK, message="OK", result=zip_path)
