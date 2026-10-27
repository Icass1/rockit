from logging import Logger

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from core.access.db.ormModels.download import DownloadRow
from core.access.db.ormModels.downloadGroup import DownloadGroupRow
from core.access.db.ormModels.downloadStatus import DownloadStatusRow
from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.user import UserRow
from core.access.downloadAccess import DownloadAccess
from core.access.downloadReuseAccess import DownloadReuseAccess
from core.access.mediaAccess import MediaAccess
from core.access.userAccess import UserAccess
from core.enums.downloadStatusEnum import DownloadStatusEnum
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework import providers
from core.framework.downloader import downloads_manager
from core.framework.downloader.baseDownload import BaseDownload
from core.framework.downloader.deferredDownload import DeferredDownload
from core.framework.media.media import Media
from core.framework.models.media import MediaModel
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.framework.provider.types import AddFromUrlResult
from core.framework.user.user import User
from core.responses.downloadsResponse import (
    DownloadGroupResponse,
    DownloadItemResponse,
    DownloadsResponse,
)
from core.responses.searchResponse import (
    BaseSearchResultsItem,
    SearchResultsResponse,
)
from core.responses.startDownloadFromUrlResponse import (
    StartDownloadFromUrlResponse,
)
from core.responses.startDownloadResponse import StartDownloadResponse
from core.utils.downloadFiles import DownloadFiles
from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


class Downloader:
    @staticmethod
    async def expand_container_async(
        session: AsyncSession,
        public_id: str,
        user_id: int,
    ) -> Result[list[str]]:
        """If public_id is a playlist or album, return its child song public_ids."""

        a_result_core: Result[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=None
        )
        if a_result_core.is_not_ok():
            return Result(code=a_result_core.code(), message=a_result_core.message())

        core_row: CoreMediaRow = a_result_core.result()
        type_key: int = core_row.media_type_key

        provider: BaseMediaProvider | None = providers.find_media_provider(
            provider_id=core_row.provider_id
        )
        if provider is None:
            return Result(code=ResultCode.NOT_FOUND, message="Provider not found")

        if type_key == MediaTypeEnum.PLAYLIST.value:
            a_result_playlist = await provider.get_playlists_with_medias_async(
                session=session, user_id=user_id, public_ids=[public_id]
            )
            if a_result_playlist.is_not_ok():
                return Result(code=a_result_playlist.code(), message=a_result_playlist.message())
            playlist = a_result_playlist.result()[0]
            song_ids = [m.item.publicId for m in playlist.medias if hasattr(m.item, "publicId")]
            return Result(code=ResultCode.OK, message="OK", result=song_ids)

        if type_key == MediaTypeEnum.ALBUM.value:
            a_result_album = await provider.get_albums_async(
                session=session, public_ids=[public_id]
            )
            if a_result_album.is_not_ok():
                return Result(code=a_result_album.code(), message=a_result_album.message())
            album = a_result_album.result()[0]
            song_ids = [s.publicId for s in album.songs]
            return Result(code=ResultCode.OK, message="OK", result=song_ids)

        return Result(
            code=ResultCode.NOT_FOUND,
            message=f"Media {public_id} is not a playlist or album",
        )

    @staticmethod
    async def _queue_downloads_async(
        session: AsyncSession,
        public_ids: list[str],
        group: DownloadGroupRow,
        user_id: int,
    ) -> Result[bool]:
        """Reuse available files in a new source group and queue only missing media."""
        unique_ids = list(dict.fromkeys(public_ids))
        if not unique_ids:
            logger.warning("Download source has no playable media")
            return Result(code=ResultCode.BAD_REQUEST, message="No downloadable media found")
        result = await DownloadReuseAccess.candidates_async(session=session, public_ids=unique_ids)
        if result.is_not_ok():
            logger.error(f"Error resolving reusable downloads: {result.info()}")
            return Result(code=result.code(), message=result.message())
        by_public_id = {candidate.public_id: candidate for candidate in result.result()}
        if any(public_id not in by_public_id for public_id in unique_ids):
            logger.warning("Some requested downloads could not be resolved")
            return Result(code=ResultCode.NOT_FOUND, message="Download media unavailable")
        candidates = [by_public_id[public_id] for public_id in unique_ids]
        existing = await DownloadFiles.existing_ids_async(candidates=candidates)
        for candidate in candidates:
            if (
                candidate.id not in existing
                and providers.find_media_provider(provider_id=candidate.provider_id) is None
            ):
                logger.warning("Requested download provider is unavailable")
                return Result(code=ResultCode.NOT_FOUND, message="Download provider unavailable")
        created = await DownloadReuseAccess.create_group_items_async(
            session=session, group=group, candidates=candidates, existing_ids=existing
        )
        if created.is_not_ok():
            logger.error(f"Error creating source download records: {created.info()}")
            return Result(code=created.code(), message=created.message())
        # Workers use a different session; persist records before making them runnable.
        try:
            await session.commit()
        except Exception as error:
            await session.rollback()
            logger.error(f"Error saving reusable download group: {error}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Could not save download group")
        by_media_id = {candidate.id: candidate for candidate in candidates}
        for row in created.result():
            if row.status_key == DownloadStatusEnum.COMPLETED.value:
                continue
            candidate = by_media_id[row.media_id]
            task = DeferredDownload(
                public_id=candidate.public_id,
                download_id=row.id,
                download_group_id=group.id,
                user_id=user_id,
            )
            task.provider_id = candidate.provider_id
            task.title = candidate.name or candidate.public_id
            task.artist = candidate.provider
            downloads_manager.add_download(task)
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def download_multiple_medias_async(
        session: AsyncSession,
        user_id: int,
        title: str,
        public_ids: list[str],
        add_to_library: bool = False,
    ) -> Result[StartDownloadResponse]:
        """
        Create a download group, queue a BaseDownload per media, and return the group's
        public_id.
        """

        a_result_group: Result[DownloadGroupRow] = await DownloadAccess.create_download_group(
            session=session,
            user_id=user_id,
            title=title,
            source_public_id=public_ids[0] if len(public_ids) == 1 else None,
        )
        if a_result_group.is_not_ok():
            logger.error(f"Error creating download group. {a_result_group.info()}")
            return Result(code=a_result_group.code(), message=a_result_group.message())

        group: DownloadGroupRow = a_result_group.result()

        if add_to_library and public_ids:
            library_result = await User.add_medias_to_library_async(
                session=session, user_id=user_id, public_ids=public_ids
            )
            if library_result.is_not_ok():
                logger.error(f"Error saving download to library. {library_result.info()}")
                return Result(code=library_result.code(), message=library_result.message())

        resolved_ids: list[str] = []
        for public_id in dict.fromkeys(public_ids):
            a_result_media: Result[MediaModel] = await Media.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
            )
            if a_result_media.is_ok():
                resolved_ids.append(public_id)
            else:
                a_result_expanded = await Downloader.expand_container_async(
                    session=session, public_id=public_id, user_id=user_id
                )
                if a_result_expanded.is_ok():
                    resolved_ids.extend(a_result_expanded.result())
                else:
                    logger.error(
                        f"Could not resolve media {public_id} for download. "
                        f"{a_result_expanded.info()}"
                    )

        queued = await Downloader._queue_downloads_async(
            session=session, public_ids=resolved_ids, group=group, user_id=user_id
        )
        if queued.is_not_ok():
            logger.error(f"Error preparing download group: {queued.info()}")
            return Result(code=queued.code(), message=queued.message())

        return Result(
            code=ResultCode.OK,
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
    ) -> Result[StartDownloadFromUrlResponse]:
        """Add media from a URL (optionally to a playlist/library) and queue
        its download in one atomic operation, so the download is queued even
        if the client disconnects right after this call returns."""

        a_result_media: Result[AddFromUrlResult] = await providers.add_from_url_async(
            session=session, url=url
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error adding media from URL '{url}'. {a_result_media.info()}")
            return Result(code=a_result_media.code(), message=a_result_media.message())
        media: AddFromUrlResult = a_result_media.result()

        if add_to_playlist and playlist_public_id:
            a_result_playlist = await providers.add_media_to_playlist_async(
                session=session,
                playlist_public_id=playlist_public_id,
                user_id=user_id,
                media_public_id=media.publicId,
            )
            if a_result_playlist.is_not_ok():
                logger.error(f"Error adding media to playlist. {a_result_playlist.info()}")

        if add_to_library:
            a_result_library = await User.add_media_to_library(
                session=session, user_id=user_id, media_public_id=media.publicId
            )
            if a_result_library.is_not_ok():
                logger.error(f"Error adding media to library. {a_result_library.info()}")
                return Result(code=a_result_library.code(), message=a_result_library.message())

        a_result_download: Result[
            StartDownloadResponse
        ] = await Downloader.download_multiple_medias_async(
            session=session,
            user_id=user_id,
            title=media.name,
            public_ids=[media.publicId],
        )
        if a_result_download.is_not_ok():
            logger.error(
                f"Error starting download for '{media.publicId}'. {a_result_download.info()}"
            )
            return Result(code=a_result_download.code(), message=a_result_download.message())

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=StartDownloadFromUrlResponse(
                data=media,
                downloadGroupId=a_result_download.result().downloadGroupId,
            ),
        )

    @staticmethod
    async def start_download_from_search_async(
        session: AsyncSession,
        user_id: int,
        artist_name: str,
        track_name: str,
        add_to_library: bool,
        add_to_playlist: bool,
        playlist_public_id: str | None,
    ) -> Result[StartDownloadFromUrlResponse]:
        """Resolve the best song match for an external discovery suggestion
        (artist + track) via a single provider search, then queue its download
        in one atomic operation by reusing the same add-and-queue path as
        start_download_from_url_async.

        Explicit selections share the same resolver used by the bounded
        playback preparation window. Reading suggestions never searches.
        """

        found = await Downloader.resolve_search_song_async(
            session=session, artist_name=artist_name, track_name=track_name
        )
        if found.is_not_ok():
            logger.error(f"Could not resolve discovery suggestion. {found.info()}")
            return Result(code=found.code(), message=found.message())
        match = found.result()

        return await Downloader.start_download_from_url_async(
            session=session,
            user_id=user_id,
            url=match.providerUrl,
            add_to_library=add_to_library,
            add_to_playlist=add_to_playlist,
            playlist_public_id=playlist_public_id,
        )

    @staticmethod
    async def resolve_search_song_async(
        session: AsyncSession, artist_name: str, track_name: str
    ) -> Result[BaseSearchResultsItem]:
        """Resolve a conservative artist/title match through registered providers."""
        a_search: Result[SearchResultsResponse] = await Media.search_async(
            session=session, query=f"{artist_name} {track_name}"
        )
        if a_search.is_not_ok():
            logger.error(f"Error searching for '{artist_name} {track_name}'. {a_search.info()}")
            return Result(code=a_search.code(), message=a_search.message())

        items: list[BaseSearchResultsItem] = a_search.result().results
        from difflib import SequenceMatcher

        from core.framework.recommendationRanking import RecommendationRanking

        def similarity(left: str, right: str) -> float:
            return SequenceMatcher(
                None,
                RecommendationRanking.normalize_text(left),
                RecommendationRanking.normalize_text(right),
            ).ratio()

        matches = [
            item
            for item in items
            if item.type == "song"
            and item.providerUrl
            and similarity(item.name, track_name) >= 0.65
            and any(similarity(artist.name, artist_name) >= 0.65 for artist in item.artists)
        ]
        match = max(
            matches,
            key=lambda item: (
                similarity(item.name, track_name)
                + max(similarity(artist.name, artist_name) for artist in item.artists)
            ),
            default=None,
        )

        if match is None:
            logger.warning(f"No downloadable song match for '{artist_name} {track_name}'.")
            return Result(
                code=ResultCode.NOT_FOUND,
                message=f"No song found for {artist_name} - {track_name}",
            )

        return Result(code=ResultCode.OK, message="OK", result=match)

    @staticmethod
    async def add_search_song_async(
        session: AsyncSession, match: BaseSearchResultsItem
    ) -> Result[str]:
        """Import provider metadata without downloading or modifying a library."""
        added = await providers.add_from_url_async(session=session, url=match.providerUrl)
        if added.is_not_ok():
            logger.error(f"Could not add search match. {added.info()}")
            return Result(code=added.code(), message=added.message())
        return Result(code=ResultCode.OK, message="OK", result=added.result().publicId)

    @staticmethod
    async def retry_download_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
    ) -> Result[bool]:
        """Reset a failed download and re-queue it for retry."""

        a_result_download: Result[
            DownloadRow
        ] = await DownloadAccess.get_download_by_media_public_id(
            session=session, media_public_id=public_id, user_id=user_id
        )
        if a_result_download.is_not_ok():
            logger.error(f"Error finding download for retry. {a_result_download.info()}")
            return Result(code=a_result_download.code(), message=a_result_download.message())

        download_row: DownloadRow = a_result_download.result()

        if download_row.status_key not in (
            DownloadStatusEnum.FAILED.value,
            DownloadStatusEnum.COMPLETED.value,
        ):
            logger.warning("Download is not in a retryable state")
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Download is not in a retryable state",
            )

        a_result_media: Result[CoreMediaRow] = await MediaAccess.get_media_from_id_async(
            session=session, id=download_row.media_id
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media for retry. {a_result_media.info()}")
            return Result(code=a_result_media.code(), message=a_result_media.message())

        media: CoreMediaRow = a_result_media.result()

        if download_row.status_key == DownloadStatusEnum.COMPLETED.value:
            deleted = await Media.delete_media_file_async(
                session=session, public_id=media.public_id
            )
            if deleted.is_not_ok():
                logger.error(f"Error removing file for redownload. {deleted.info()}")
                return Result(code=deleted.code(), message=deleted.message())

        a_result_reset: Result[DownloadRow] = await DownloadAccess.reset_download_for_retry(
            session=session, download_id=download_row.id
        )
        if a_result_reset.is_not_ok():
            logger.error(f"Error resetting download. {a_result_reset.info()}")
            return Result(code=a_result_reset.code(), message=a_result_reset.message())

        provider: BaseMediaProvider | None = providers.find_media_provider(
            provider_id=media.provider_id
        )
        if provider is None:
            return Result(code=ResultCode.NOT_FOUND, message="Provider not found")

        a_result_base: Result[BaseDownload] = await provider.start_download_async(
            session=session,
            public_id=media.public_id,
            download_id=download_row.id,
            download_group_id=download_row.download_group_id,
            user_id=user_id,
        )
        if a_result_base.is_not_ok():
            logger.error(f"Provider could not create download for retry. {a_result_base.info()}")
            return Result(code=a_result_base.code(), message=a_result_base.message())

        base_download: BaseDownload = a_result_base.result()
        base_download.provider_id = media.provider_id
        downloads_manager.add_download(base_download)

        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def get_downloads_async(session: AsyncSession, user_id: int) -> Result[DownloadsResponse]:
        """Get all download groups with their items for a user.

        Batches database and provider queries to avoid the N+1 pattern: the
        downloads, media rows and provider metadata for every group are fetched
        with a handful of queries instead of one query per item.
        """

        a_result_groups: Result[
            list[DownloadGroupRow]
        ] = await DownloadAccess.get_download_groups_by_user_id(session=session, user_id=user_id)
        if a_result_groups.is_not_ok():
            logger.error(f"Error getting download groups. {a_result_groups.info()}")
            return Result(code=a_result_groups.code(), message=a_result_groups.message())

        groups: list[DownloadGroupRow] = a_result_groups.result()
        if not groups:
            return Result(
                code=ResultCode.OK,
                message="OK",
                result=DownloadsResponse(downloads=[]),
            )

        # 1. Batch fetch all download rows across every group in one query.
        group_ids: list[int] = [group.id for group in groups]
        a_result_downloads: Result[
            list[DownloadRow]
        ] = await DownloadAccess.get_downloads_by_group_ids(
            session=session, download_group_ids=group_ids
        )
        if a_result_downloads.is_not_ok():
            logger.error(f"Error getting downloads. {a_result_downloads.info()}")
            return Result(code=a_result_downloads.code(), message=a_result_downloads.message())

        downloads: list[DownloadRow] = a_result_downloads.result()
        downloads_by_group: dict[int, list[DownloadRow]] = {}
        media_ids: list[int] = []
        for download in downloads:
            downloads_by_group.setdefault(download.download_group_id, []).append(download)
            media_ids.append(download.media_id)

        # 2. Batch fetch all media rows in one query.
        media_by_id: dict[int, CoreMediaRow] = {}
        provider_meta: dict[str, tuple[str, str | None, str | None]] = {}

        if media_ids:
            a_result_medias: Result[
                list[CoreMediaRow]
            ] = await MediaAccess.get_medias_from_ids_async(session=session, ids=media_ids)
            if a_result_medias.is_not_ok():
                logger.error(f"Error getting media. {a_result_medias.info()}")
                return Result(code=a_result_medias.code(), message=a_result_medias.message())

            media_by_id = {media.id: media for media in a_result_medias.result()}

            # 3. Batch fetch provider metadata (name/image/artist) grouped by
            #    provider + media type, executing batches serially on the request session.
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
                                subtitle = song.artists[0].name if song.artists else None
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
                                subtitle = video.artists[0].name if video.artists else None
                                provider_meta[video.publicId] = (
                                    video.name,
                                    video.imageUrl,
                                    subtitle,
                                )
                except Exception as e:
                    logger.error(f"Error fetching provider batch. {e}", exc_info=True)

            for provider, media_type, public_ids in batches:
                await fetch_provider_batch(provider, media_type, list(dict.fromkeys(public_ids)))

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
                        publicId=download.public_id,
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
                    sourcePublicId=group.source_public_id,
                    name=group.title,
                    dateStarted=group.date_started,
                    dateEnded=group.date_ended,
                    success=group.success or 0,
                    fail=group.fail or 0,
                    items=items,
                )
            )

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=DownloadsResponse(downloads=result_groups),
        )

    @staticmethod
    async def mark_download_seen_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> Result[bool]:
        """Mark a download group as seen by public_id."""

        a_result_group: Result[
            DownloadGroupRow
        ] = await DownloadAccess.get_download_group_by_public_id(
            session=session, public_id=public_id, user_id=user_id
        )
        if a_result_group.is_not_ok():
            logger.error(f"Error getting download group. {a_result_group.info()}")
            return Result(code=a_result_group.code(), message=a_result_group.message())

        a_result_mark: Result[bool] = await DownloadAccess.mark_download_group_seen(
            session=session, group=a_result_group.result()
        )
        if a_result_mark.is_not_ok():
            logger.error(f"Error marking download group seen. {a_result_mark.info()}")
            return Result(code=a_result_mark.code(), message=a_result_mark.message())

        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def update_settings_async(
        session: AsyncSession, user: UserRow, auto_add: bool
    ) -> Result[bool]:
        """Update the download preference through the access layer."""
        return await UserAccess.update_download_settings_async(
            session=session, user=user, auto_add=auto_add
        )

    @staticmethod
    async def delete_download_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> Result[bool]:
        """Delete a finished file and hide its history entry for this user."""
        found = await DownloadAccess.get_download_by_media_public_id(
            session=session, media_public_id=public_id, user_id=user_id
        )
        if found.is_not_ok():
            logger.error(f"Error finding download to delete. {found.info()}")
            return Result(code=found.code(), message=found.message())
        download = found.result()
        media_result = await MediaAccess.get_media_from_id_async(
            session=session, id=download.media_id
        )
        if media_result.is_not_ok():
            logger.error(f"Error resolving downloaded media. {media_result.info()}")
            return Result(code=media_result.code(), message=media_result.message())
        if download.status_key not in (
            DownloadStatusEnum.COMPLETED.value,
            DownloadStatusEnum.FAILED.value,
        ):
            logger.warning("Cannot delete an active download")
            return Result(code=ResultCode.BAD_REQUEST, message="Cannot delete an active download")
        if download.status_key == DownloadStatusEnum.COMPLETED.value:
            deleted = await Media.delete_media_file_async(
                session=session, public_id=media_result.result().public_id
            )
            if deleted.is_not_ok():
                logger.error(f"Error deleting download file. {deleted.info()}")
                return Result(code=deleted.code(), message=deleted.message())
        return await DownloadAccess.dismiss_download_async(session=session, download=download)
