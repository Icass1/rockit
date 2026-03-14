from logging import Logger
from typing import List
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.downloadAccess import DownloadAccess
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
from backend.core.access.db.ormModels.download import DownloadRow

from backend.core.framework import providers
from backend.core.framework.downloader import downloads_manager
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework.downloader.baseDownload import BaseDownload

from backend.core.responses.startDownloadResponse import StartDownloadResponse

logger: Logger = getLogger(__name__)


class Downloader:
    @staticmethod
    async def download_multiple_songs_async(
        session: AsyncSession, user_id: int, title: str, public_ids: List[str]
    ) -> AResult[StartDownloadResponse]:
        """Create a download group, queue a BaseDownload per song, and return the group's public_id."""

        a_result_group: AResult[DownloadGroupRow] = (
            await DownloadAccess.create_download_group(
                session=session,
                user_id=user_id,
                title=title,
            )
        )
        if a_result_group.is_not_ok():
            logger.error(f"Error creating download group. {a_result_group.info()}")
            return AResult(code=a_result_group.code(), message=a_result_group.message())

        group: DownloadGroupRow = a_result_group.result()

        for public_id in public_ids:
            found_provider: BaseProvider | None = None
            a_result_media: AResult[MediaModel] | None = None

            for provider in providers.get_providers():
                a_result_test: AResult[MediaModel] = (
                    await Media.get_or_create_media_from_provider_async(
                        session=session,
                        provider=provider,
                        public_id=public_id,
                    )
                )
                if a_result_test.is_ok():
                    found_provider = provider
                    a_result_media = a_result_test
                    break

            if found_provider is None or a_result_media is None:
                logger.error(f"No provider could handle public_id {public_id}.")
                continue

            song: MediaModel = a_result_media.result()

            a_result_download: AResult[DownloadRow] = (
                await DownloadAccess.create_download(
                    session=session,
                    download_group_id=group.id,
                    song_id=song.id,
                )
            )
            if a_result_download.is_not_ok():
                logger.error(
                    f"Error creating download row for {public_id}. {a_result_download.info()}"
                )
                continue

            download_row: DownloadRow = a_result_download.result()

            a_result_base_download: AResult[BaseDownload] = (
                await found_provider.start_download_async(
                    session=session,
                    public_id=public_id,
                    download_id=download_row.id,
                    download_group_id=group.id,
                    user_id=user_id,
                )
            )
            if a_result_base_download.is_not_ok():
                logger.error(
                    f"Provider could not create download for {public_id}. {a_result_base_download.info()}"
                )
                continue

            downloads_manager.add_download(a_result_base_download.result())

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=StartDownloadResponse(downloadGroupId=group.public_id),
        )
