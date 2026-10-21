from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResultCode
from backend.core.framework import providers
from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class DeferredDownload(BaseDownload):
    """Resolve provider-specific work only when a download worker has capacity."""

    async def download_method_async(self, session: AsyncSession) -> AResultCode:
        provider = providers.find_media_provider(provider_id=self.provider_id)
        if provider is None:
            logger.error("Queued download provider is unavailable")
            return AResultCode(
                code=AResultCode.NOT_FOUND, message="Provider unavailable"
            )
        result = await provider.start_download_async(
            session=session,
            public_id=self.public_id,
            download_id=self.download_id,
            download_group_id=self.download_group_id,
            user_id=self.user_id,
        )
        if result.is_not_ok():
            logger.error(f"Could not prepare queued download: {result.info()}")
            return AResultCode(code=result.code(), message=result.message())
        task = result.result()
        self.title = task.title
        self.artist = task.artist
        task.provider_id = self.provider_id
        task.retry_count = self.retry_count
        return await task.download_method_async(session=session)
