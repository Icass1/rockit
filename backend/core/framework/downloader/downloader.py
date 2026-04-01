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
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
from backend.core.access.db.ormModels.download import DownloadRow
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.framework import providers
from backend.core.framework.downloader import downloads_manager
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework.downloader.baseDownload import BaseDownload

from backend.core.responses.startDownloadResponse import StartDownloadResponse
from backend.core.responses.downloadsResponse import (
    DownloadsResponse,
    DownloadGroupResponse,
    DownloadItemResponse,
)

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
            a_result_song: AResult[MediaModel] = (
                await Media.get_media_from_public_id_async(
                    session=session,
                    public_id=public_id,
                    media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
                )
            )
            if a_result_song.is_not_ok():
                logger.error(f"Error getting song {public_id}. {a_result_song.info()}")
                continue

            song: MediaModel = a_result_song.result()
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

    @staticmethod
    async def get_downloads_async(
        session: AsyncSession, user_id: int
    ) -> AResult[DownloadsResponse]:
        """Get all download groups with their items for a user."""

        STATUS_MESSAGES: dict[int, str] = {
            1: "In queue",
            2: "Downloading",
            3: "Done",
            4: "Error",
            5: "Fetching",
            6: "Starting",
            7: "Waiting",
        }

        a_result_groups: AResult[list[DownloadGroupRow]] = (
            await DownloadAccess.get_download_groups_by_user_id(
                session=session, user_id=user_id
            )
        )
        if a_result_groups.is_not_ok():
            logger.error(f"Error getting download groups. {a_result_groups.info()}")
            return AResult(
                code=a_result_groups.code(), message=a_result_groups.message()
            )

        groups: list[DownloadGroupRow] = a_result_groups.result()

        result_groups: list[DownloadGroupResponse] = []

        for group in groups:
            a_result_downloads: AResult[list[DownloadRow]] = (
                await DownloadAccess.get_downloads_by_group_id(
                    session=session, download_group_id=group.id
                )
            )
            if a_result_downloads.is_not_ok():
                logger.error(
                    f"Error getting downloads for group. {a_result_downloads.info()}"
                )
                continue

            downloads: list[DownloadRow] = a_result_downloads.result()

            items: list[DownloadItemResponse] = []
            for download in downloads:
                a_result_media: AResult[CoreMediaRow] = (
                    await MediaAccess.get_media_from_id_async(
                        session=session, id=download.media_id
                    )
                )
                if a_result_media.is_ok():
                    media: CoreMediaRow = a_result_media.result()

                    provider: BaseProvider | None = providers.find_provider(
                        provider_id=media.provider_id
                    )

                    media_name: str = media.public_id
                    image_url: str | None = None
                    subtitle: str | None = None

                    if provider:
                        if media.media_type_key == MediaTypeEnum.SONG.value:
                            a_result_song = await provider.get_song_async(
                                session=session, public_id=media.public_id
                            )
                            if a_result_song.is_ok():
                                song = a_result_song.result()
                                media_name = song.name
                                image_url = song.imageUrl
                                if song.artists:
                                    subtitle = song.artists[0].name
                        elif media.media_type_key == MediaTypeEnum.VIDEO.value:
                            a_result_video = await provider.get_video_async(
                                session=session, public_id=media.public_id
                            )
                            if a_result_video.is_ok():
                                video = a_result_video.result()
                                media_name = video.name
                                image_url = video.imageUrl

                    status_message: str = STATUS_MESSAGES.get(
                        download.status_key, "Unknown"
                    )

                    if download.status_key == 3:
                        completed_val: float = 100.0
                    elif download.status_key == 4:
                        completed_val = 0.0
                    else:
                        completed_val = (
                            float(download.completed) if download.completed else 0.0
                        )

                    download_date: str = ""
                    if download.download_status_list:
                        last_status: DownloadStatusRow = download.download_status_list[-1]
                        if last_status.date_added:
                            download_date = last_status.date_added.isoformat()

                    items.append(
                        DownloadItemResponse(
                            publicId=media.public_id,
                            name=media_name,
                            subtitle=subtitle,
                            imageUrl=image_url,
                            completed=completed_val,
                            message=status_message,
                            dateAdded=download_date,
                        )
                    )

            result_groups.append(
                DownloadGroupResponse(
                    publicId=group.public_id,
                    title=group.title,
                    dateStarted=(
                        group.date_started.isoformat() if group.date_started else ""
                    ),
                    success=group.success or 0,
                    fail=group.fail or 0,
                    items=items,
                )
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=DownloadsResponse(downloads=result_groups),
        )

    @staticmethod
    async def mark_download_seen_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> AResult[bool]:
        """Delete a download group and all its child downloads by public_id."""

        a_result_group: AResult[DownloadGroupRow] = (
            await DownloadAccess.get_download_group_by_public_id(
                session=session, public_id=public_id, user_id=user_id
            )
        )
        if a_result_group.is_not_ok():
            logger.error(f"Error getting download group. {a_result_group.info()}")
            return AResult(code=a_result_group.code(), message=a_result_group.message())

        a_result_delete: AResult[bool] = (
            await DownloadAccess.delete_download_group_with_downloads(
                session=session, group=a_result_group.result()
            )
        )
        if a_result_delete.is_not_ok():
            logger.error(f"Error deleting download group. {a_result_delete.info()}")
            return AResult(
                code=a_result_delete.code(), message=a_result_delete.message()
            )

        return AResult(code=AResultCode.OK, message="OK", result=True)
