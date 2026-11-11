from sqlalchemy.ext.asyncio import AsyncSession

from core.access.downloadReuseAccess import DownloadReuseAccess
from core.framework import providers
from core.framework.downloader.baseDownload import BaseDownload
from core.framework.objectFiles import ObjectFiles
from core.utils.downloadFiles import DownloadFiles
from logger import getLogger
from result import ResultCode

logger = getLogger(__name__)


class DeferredDownload(BaseDownload):
    """Resolve provider-specific work only when a download worker has capacity."""

    replace_existing: bool = False

    async def download_method_async(self, session: AsyncSession) -> ResultCode:
        found = await DownloadReuseAccess.candidates_async(
            session=session, public_ids=[self.public_id]
        )
        if found.is_not_ok():
            logger.error(f"Could not check queued download file: {found.info()}")
            return ResultCode(code=found.code(), message=found.message())
        candidates = found.result()
        if not candidates:
            logger.warning("Queued media no longer exists")
            return ResultCode(code=ResultCode.NOT_FOUND, message="Download media unavailable")
        self.title = candidates[0].name or self.public_id
        self.artist = candidates[0].provider
        existing: set[int] = (
            set()
            if self.replace_existing
            else await DownloadFiles.existing_ids_async(candidates=candidates)
        )
        if existing:
            return ResultCode(code=ResultCode.OK, message="Existing file reused")
        provider = providers.find_media_provider(provider_id=self.provider_id)
        if provider is None:
            logger.error("Queued download provider is unavailable")
            return ResultCode(code=ResultCode.NOT_FOUND, message="Provider unavailable")
        result = await provider.start_download_async(
            session=session,
            public_id=self.public_id,
            download_id=self.download_id,
            download_group_id=self.download_group_id,
            user_id=self.user_id,
        )
        if result.is_not_ok():
            logger.error(f"Could not prepare queued download: {result.info()}")
            return ResultCode(code=result.code(), message=result.message())
        task = result.result()
        self.title = task.title
        self.artist = task.artist
        task.provider_id = self.provider_id
        task.retry_count = self.retry_count
        old_path = candidates[0].path
        try:
            downloaded = await task.download_method_async(session=session)
            if downloaded.is_not_ok():
                await session.rollback()
                return downloaded
            updated = await DownloadReuseAccess.candidates_async(
                session=session, public_ids=[self.public_id]
            )
            if updated.is_not_ok():
                logger.error(f"Could not resolve replacement download: {updated.info()}")
                await session.rollback()
                return ResultCode(code=updated.code(), message=updated.message())
            files = updated.result()
            new_path = files[0].path if files else None
            if not new_path or new_path == old_path or not await ObjectFiles.exists_async(new_path):
                logger.error("Downloaded file is unavailable; preserving the previous file")
                await session.rollback()
                return ResultCode(
                    code=ResultCode.GENERAL_ERROR, message="Downloaded file unavailable"
                )
            # Publish the reference before removing the old object. A failed commit must
            # leave the previous reference and its bytes intact.
            await session.commit()
        except Exception as error:
            await session.rollback()
            logger.error(f"Could not publish downloaded file: {error}", exc_info=True)
            return ResultCode(code=ResultCode.GENERAL_ERROR, message="Could not publish download")
        if old_path and old_path != new_path:
            try:
                await ObjectFiles.delete_async(old_path)
            except Exception:
                logger.exception("Could not remove superseded download: %s", old_path)
        return downloaded
