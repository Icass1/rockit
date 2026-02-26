from logging import Logger
from typing import List

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db import rockit_db
from backend.core.access.downloadAccess import DownloadAccess
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.db.ormModels.song import CoreSongRow
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
from backend.core.access.db.ormModels.download import DownloadRow

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework.providers.providers import Providers
from backend.core.framework.downloader import downloads_manager
from backend.core.framework.downloader.baseDownload import BaseDownload

from backend.core.responses.startDownloadResponse import StartDownloadResponse

logger: Logger = getLogger(__name__)


class Downloader:
    @staticmethod
    async def download_multiple_songs_async(
        user_id: int,
        title: str,
        public_ids: List[str],
        providers: Providers,
    ) -> AResult[StartDownloadResponse]:
        """Create a download group, queue a BaseDownload per song, and return the group's public_id."""

        async with rockit_db.session_scope_async() as session:
            a_result_group: AResult[DownloadGroupRow] = (
                await DownloadAccess.create_download_group(
                    session=session,
                    user_id=user_id,
                    title=title,
                )
            )
            if a_result_group.is_not_ok():
                logger.error(f"Error creating download group. {a_result_group.info()}")
                return AResult(
                    code=a_result_group.code(), message=a_result_group.message()
                )

            group: DownloadGroupRow = a_result_group.result()

            for public_id in public_ids:
                a_result_song: AResult[CoreSongRow] = (
                    await MediaAccess.get_song_from_public_id_async(public_id=public_id)
                )
                if a_result_song.is_not_ok():
                    logger.error(
                        f"Error getting song {public_id}. {a_result_song.info()}"
                    )
                    continue

                song: CoreSongRow = a_result_song.result()
                provider: BaseProvider | None = providers.find_provider(
                    provider_id=song.provider_id
                )
                if provider is None:
                    logger.error(f"No provider found for song {public_id}.")
                    continue

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
                    await provider.start_download_async(
                        public_id=public_id,
                        download_id=download_row.id,
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
