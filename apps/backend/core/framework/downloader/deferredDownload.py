from sqlalchemy.ext.asyncio import AsyncSession

from core.access.downloadReuseAccess import DownloadReuseAccess
from core.framework import providers
from core.framework.downloader.baseDownload import BaseDownload
from core.utils.downloadFiles import DownloadFiles
from logger import getLogger
from result import ResultCode

logger = getLogger(__name__)


class DeferredDownload(BaseDownload):
    """Resolve provider-specific work only when a download worker has capacity."""

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
        existing = await DownloadFiles.existing_ids_async(candidates=candidates)
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
        return await task.download_method_async(session=session)
