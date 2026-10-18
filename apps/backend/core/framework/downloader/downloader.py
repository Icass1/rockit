import asyncio

from logging import Logger
from typing import List
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum

from backend.core.access.downloadAccess import DownloadAccess
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
from backend.core.access.db.ormModels.download import DownloadRow
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow
from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.core.framework import providers
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.downloader import downloads_manager
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.provider.types import AddFromUrlAResult
from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.user.user import User

from backend.core.responses.startDownloadResponse import StartDownloadResponse
from backend.core.responses.startDownloadFromUrlResponse import (
    StartDownloadFromUrlResponse,
)
from backend.core.responses.downloadsResponse import (
    DownloadsResponse,
    DownloadGroupResponse,
    DownloadItemResponse,
)

logger: Logger = getLogger(__name__)


class Downloader:
    @staticmethod
    async def expand_container_async(
        session: AsyncSession,
        public_id: str,
        user_id: int,
    ) -> AResult[List[str]]:
        """If public_id is a playlist or album, return its child song public_ids."""

        a_result_core: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session, public_id=public_id, media_type_keys=None
            )
        )
        if a_result_core.is_not_ok():
            return AResult(code=a_result_core.code(), message=a_result_core.message())

        core_row: CoreMediaRow = a_result_core.result()
        type_key: int = core_row.media_type_key

        provider: BaseMediaProvider | None = providers.find_media_provider(
            provider_id=core_row.provider_id
        )
        if provider is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found")

        if type_key == MediaTypeEnum.PLAYLIST.value:
            a_result_playlist = await provider.get_playlists_with_medias_async(
                session=session, user_id=user_id, public_ids=[public_id]
            )
            if a_result_playlist.is_not_ok():
                return AResult(
                    code=a_result_playlist.code(), message=a_result_playlist.message()
                )
            playlist = a_result_playlist.result()[0]
            song_ids = [
                m.item.publicId for m in playlist.medias if hasattr(m.item, "publicId")
            ]
            return AResult(code=AResultCode.OK, message="OK", result=song_ids)

        if type_key == MediaTypeEnum.ALBUM.value:
            a_result_album = await provider.get_albums_async(
                session=session, public_ids=[public_id]
            )
            if a_result_album.is_not_ok():
                return AResult(
                    code=a_result_album.code(), message=a_result_album.message()
                )
            album = a_result_album.result()[0]
            song_ids = [s.publicId for s in album.songs]
            return AResult(code=AResultCode.OK, message="OK", result=song_ids)

        return AResult(
            code=AResultCode.NOT_FOUND,
            message=f"Media {public_id} is not a playlist or album",
        )

    @staticmethod
    async def _queue_single_download_async(
        session: AsyncSession,
        public_id: str,
        group: DownloadGroupRow,
        user_id: int,
    ) -> None:
        """Queue a single song/video for download under the given group."""

        a_result_media: AResult[MediaModel] = (
            await Media.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
            )
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media {public_id}. {a_result_media.info()}")
            return

        media: MediaModel = a_result_media.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            provider_id=media.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for media {public_id}.")
            return

        a_result_download: AResult[DownloadRow] = await DownloadAccess.create_download(
            session=session,
            download_group_id=group.id,
            media_id=media.id,
        )
        if a_result_download.is_not_ok():
            if a_result_download.code() == AResultCode.ALREADY_EXISTS:
                existing_download = a_result_download.result()
                if existing_download.status_key == 3:
                    logger.info(f"Download already completed for {public_id}, skipping")
                    return
                if existing_download.status_key in [1, 2, 5, 6, 7]:
                    logger.info(
                        f"Download already in progress for {public_id}, skipping"
                    )
                    return
            logger.error(
                f"Error creating download row for {public_id}. {a_result_download.info()}"
            )
            return

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
            return

        base_download: BaseDownload = a_result_base_download.result()
        base_download.provider_id = media.provider_id
        downloads_manager.add_download(base_download)

    @staticmethod
    async def download_multiple_medias_async(
        session: AsyncSession, user_id: int, title: str, public_ids: List[str]
    ) -> AResult[StartDownloadResponse]:
        """Create a download group, queue a BaseDownload per media, and return the group's public_id."""

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
            a_result_media: AResult[MediaModel] = (
                await Media.get_media_from_public_id_async(
                    session=session,
                    public_id=public_id,
                    media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
                )
            )
            if a_result_media.is_ok():
                await Downloader._queue_single_download_async(
                    session=session, public_id=public_id, group=group, user_id=user_id
                )
            else:
                a_result_expanded = await Downloader.expand_container_async(
                    session=session, public_id=public_id, user_id=user_id
                )
                if a_result_expanded.is_ok():
                    for child_public_id in a_result_expanded.result():
                        await Downloader._queue_single_download_async(
                            session=session,
                            public_id=child_public_id,
                            group=group,
                            user_id=user_id,
                        )
                else:
                    logger.error(
                        f"Could not resolve media {public_id} for download. {a_result_expanded.info()}"
                    )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=StartDownloadResponse(downloadGroupId=group.public_id),
        )

    @staticmethod
    async def start_download_from_url_async(
        session: AsyncSession,
        user_id: int,
        url: str,
        add_to_library: bool,
        add_to_playlist: bool,
        playlist_public_id: str | None,
    ) -> AResult[StartDownloadFromUrlResponse]:
        """Add media from a URL (optionally to a playlist/library) and queue
        its download in one atomic operation, so the download is queued even
        if the client disconnects right after this call returns."""

        a_result_media: AResult[AddFromUrlAResult] = await providers.add_from_url_async(
            session=session, url=url
        )
        if a_result_media.is_not_ok():
            logger.error(
                f"Error adding media from URL '{url}'. {a_result_media.info()}"
            )
            return AResult(code=a_result_media.code(), message=a_result_media.message())
        media: AddFromUrlAResult = a_result_media.result()

        if add_to_playlist and playlist_public_id:
            from backend.default.framework.playlist import Playlist

            a_result_playlist = await Playlist.add_media_to_playlist_async(
                session=session,
                playlist_public_id=playlist_public_id,
                user_id=user_id,
                media_public_id=media.publicId,
            )
            if a_result_playlist.is_not_ok():
                logger.error(
                    f"Error adding media to playlist. {a_result_playlist.info()}"
                )

        if add_to_library:
            a_result_library = await User.add_media_to_library(
                session=session, user_id=user_id, media_public_id=media.publicId
            )
            if a_result_library.is_not_ok():
                logger.error(
                    f"Error adding media to library. {a_result_library.info()}"
                )

        a_result_download: AResult[StartDownloadResponse] = (
            await Downloader.download_multiple_medias_async(
                session=session,
                user_id=user_id,
                title=media.name,
                public_ids=[media.publicId],
            )
        )
        if a_result_download.is_not_ok():
            logger.error(
                f"Error starting download for '{media.publicId}'. {a_result_download.info()}"
            )
            return AResult(
                code=a_result_download.code(), message=a_result_download.message()
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=StartDownloadFromUrlResponse(
                data=media,
                downloadGroupId=a_result_download.result().downloadGroupId,
            ),
        )

    @staticmethod
    async def retry_download_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
    ) -> AResult[bool]:
        """Reset a failed download and re-queue it for retry."""

        a_result_download: AResult[DownloadRow] = (
            await DownloadAccess.get_download_by_media_public_id(
                session=session, media_public_id=public_id, user_id=user_id
            )
        )
        if a_result_download.is_not_ok():
            logger.error(
                f"Error finding download for retry. {a_result_download.info()}"
            )
            return AResult(
                code=a_result_download.code(), message=a_result_download.message()
            )

        download_row: DownloadRow = a_result_download.result()

        if download_row.status_key != DownloadStatusEnum.FAILED.value:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Download is not in a retryable state",
            )

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_id_async(
                session=session, id=download_row.media_id
            )
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media for retry. {a_result_media.info()}")
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media: CoreMediaRow = a_result_media.result()

        a_result_reset: AResult[DownloadRow] = (
            await DownloadAccess.reset_download_for_retry(
                session=session, download_id=download_row.id
            )
        )
        if a_result_reset.is_not_ok():
            logger.error(f"Error resetting download. {a_result_reset.info()}")
            return AResult(code=a_result_reset.code(), message=a_result_reset.message())

        provider: BaseMediaProvider | None = providers.find_media_provider(
            provider_id=media.provider_id
        )
        if provider is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found")

        a_result_base: AResult[BaseDownload] = await provider.start_download_async(
            session=session,
            public_id=media.public_id,
            download_id=download_row.id,
            download_group_id=download_row.download_group_id,
            user_id=user_id,
        )
        if a_result_base.is_not_ok():
            logger.error(
                f"Provider could not create download for retry. {a_result_base.info()}"
            )
            return AResult(code=a_result_base.code(), message=a_result_base.message())

        base_download: BaseDownload = a_result_base.result()
        base_download.provider_id = media.provider_id
        downloads_manager.add_download(base_download)

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def get_downloads_async(
        session: AsyncSession, user_id: int
    ) -> AResult[DownloadsResponse]:
        """Get all download groups with their items for a user.

        Batches database and provider queries to avoid the N+1 pattern: the
        downloads, media rows and provider metadata for every group are fetched
        with a handful of queries instead of one query per item.
        """

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
        if not groups:
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=DownloadsResponse(downloads=[]),
            )

        # 1. Batch fetch all download rows across every group in one query.
        group_ids: list[int] = [group.id for group in groups]
        a_result_downloads: AResult[list[DownloadRow]] = (
            await DownloadAccess.get_downloads_by_group_ids(
                session=session, download_group_ids=group_ids
            )
        )
        if a_result_downloads.is_not_ok():
            logger.error(f"Error getting downloads. {a_result_downloads.info()}")
            return AResult(
                code=a_result_downloads.code(), message=a_result_downloads.message()
            )

        downloads: list[DownloadRow] = a_result_downloads.result()
        downloads_by_group: dict[int, list[DownloadRow]] = {}
        media_ids: list[int] = []
        for download in downloads:
            downloads_by_group.setdefault(download.download_group_id, []).append(
                download
            )
            media_ids.append(download.media_id)

        # 2. Batch fetch all media rows in one query.
        media_by_id: dict[int, CoreMediaRow] = {}
        provider_meta: dict[str, tuple[str, str | None, str | None]] = {}

        if media_ids:
            a_result_medias: AResult[list[CoreMediaRow]] = (
                await MediaAccess.get_medias_from_ids_async(
                    session=session, ids=media_ids
                )
            )
            if a_result_medias.is_not_ok():
                logger.error(f"Error getting media. {a_result_medias.info()}")
                return AResult(
                    code=a_result_medias.code(), message=a_result_medias.message()
                )

            media_by_id = {media.id: media for media in a_result_medias.result()}

            # 3. Batch fetch provider metadata (name/image/artist) grouped by
            #    provider + media type, running each provider batch concurrently.
            #    Build a lookup public_id -> (name, imageUrl, subtitle).
            batches: list[tuple[BaseMediaProvider, str, list[str]]] = []

            by_provider_type: dict[tuple[int, int], list[str]] = {}
            for download in downloads:
                media: CoreMediaRow | None = media_by_id.get(download.media_id)
                if media is None:
                    continue
                if media.media_type_key not in (
                    MediaTypeEnum.SONG.value,
                    MediaTypeEnum.VIDEO.value,
                ):
                    continue
                key: tuple[int, int] = (media.provider_id, media.media_type_key)
                by_provider_type.setdefault(key, []).append(media.public_id)

            for (provider_id, media_type_key), public_ids in by_provider_type.items():
                provider: BaseMediaProvider | None = providers.find_media_provider(
                    provider_id=provider_id
                )
                if provider is None:
                    continue
                if media_type_key == MediaTypeEnum.SONG.value:
                    batches.append((provider, "song", public_ids))
                elif media_type_key == MediaTypeEnum.VIDEO.value:
                    batches.append((provider, "video", public_ids))

            async def fetch_provider_batch(
                provider: BaseMediaProvider, media_type: str, public_ids: list[str]
            ) -> None:
                try:
                    if media_type == "song":
                        a_result = await provider.get_songs_async(
                            session=session, public_ids=public_ids
                        )
                        if a_result.is_ok():
                            for song in a_result.result():
                                subtitle = (
                                    song.artists[0].name if song.artists else None
                                )
                                provider_meta[song.publicId] = (
                                    song.name,
                                    song.imageUrl,
                                    subtitle,
                                )
                    elif media_type == "video":
                        a_result = await provider.get_videos_async(
                            session=session, public_ids=public_ids
                        )
                        if a_result.is_ok():
                            for video in a_result.result():
                                subtitle = (
                                    video.artists[0].name if video.artists else None
                                )
                                provider_meta[video.publicId] = (
                                    video.name,
                                    video.imageUrl,
                                    subtitle,
                                )
                except Exception as e:
                    logger.error(f"Error fetching provider batch. {e}", exc_info=True)

            await asyncio.gather(
                *(fetch_provider_batch(p, m, ids) for p, m, ids in batches)
            )

        # 4. Assemble the response groups/items.
        result_groups: list[DownloadGroupResponse] = []

        for group in groups:
            group_downloads: list[DownloadRow] = downloads_by_group.get(group.id, [])

            items: list[DownloadItemResponse] = []
            for download in group_downloads:
                media: CoreMediaRow | None = media_by_id.get(download.media_id)
                if media is None:
                    continue

                meta_name, meta_image, meta_subtitle = provider_meta.get(
                    media.public_id, (media.public_id, None, None)
                )

                completed_val: float = 0.0
                if download.status_key == 3:
                    completed_val = 100.0
                elif download.status_key == 4:
                    completed_val = 0.0
                elif download.download_status_list:
                    last_status: DownloadStatusRow = download.download_status_list[-1]
                    completed_val = float(last_status.completed)

                content_type: str = MediaTypeEnum(media.media_type_key).name.lower()

                items.append(
                    DownloadItemResponse(
                        publicId=media.public_id,
                        mediaPublicId=media.public_id,
                        name=meta_name,
                        subtitle=meta_subtitle,
                        status=DownloadStatusEnum(download.status_key),
                        imageUrl=meta_image,
                        progress=completed_val,
                        dateStarted=download.date_started,
                        dateEnded=download.date_ended,
                        contentType=content_type,
                        retryCount=download.retry_count,
                    )
                )

            result_groups.append(
                DownloadGroupResponse(
                    publicId=group.public_id,
                    name=group.title,
                    dateStarted=group.date_started,
                    dateEnded=group.date_ended,
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
        """Mark a download group as seen by public_id."""

        a_result_group: AResult[DownloadGroupRow] = (
            await DownloadAccess.get_download_group_by_public_id(
                session=session, public_id=public_id, user_id=user_id
            )
        )
        if a_result_group.is_not_ok():
            logger.error(f"Error getting download group. {a_result_group.info()}")
            return AResult(code=a_result_group.code(), message=a_result_group.message())

        a_result_mark: AResult[bool] = await DownloadAccess.mark_download_group_seen(
            session=session, group=a_result_group.result()
        )
        if a_result_mark.is_not_ok():
            logger.error(f"Error marking download group seen. {a_result_mark.info()}")
            return AResult(code=a_result_mark.code(), message=a_result_mark.message())

        return AResult(code=AResultCode.OK, message="OK", result=True)
