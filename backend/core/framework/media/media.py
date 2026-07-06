import asyncio
from typing import List
from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.framework import providers
from backend.core.framework.models.media import MediaModel
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider

from backend.core.responses.mediaResponse import MediaResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from backend.core.responses.searchResponse import (
    BaseSearchResultsItem,
    SearchResultsResponse,
)

logger: Logger = getLogger(__name__)


class Media:
    @staticmethod
    async def get_medias_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
        media_type_keys: List[MediaTypeEnum] | None,
    ) -> AResult[List[MediaModel]]:
        """TODO"""

        a_result: AResult[List[CoreMediaRow]] = (
            await MediaAccess.get_medias_from_public_ids_async(
                session=session, public_ids=public_ids, media_type_keys=media_type_keys
            )
        )

        if a_result.is_not_ok():
            logger.error(
                f"Error getting medias from database for public ids {public_ids}. {a_result.info()}"
            )
            return AResult(code=a_result.code(), message=a_result.message())

        result: List[MediaModel] = [
            MediaModel(
                public_id=media.public_id,
                id=media.id,
                provider_id=media.provider_id,
            )
            for media in a_result.result()
        ]

        return AResult(code=AResultCode.OK, message="OK", result=result)

    @staticmethod
    async def get_media_from_public_id_async(
        session: AsyncSession,
        public_id: str,
        media_type_keys: List[MediaTypeEnum] | None,
    ) -> AResult[MediaModel]:
        """TODO"""

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session, public_id=public_id, media_type_keys=media_type_keys
            )
        )

        if a_result_media.is_not_ok():
            logger.error(
                f"Error getting media from database for public id {public_id}. {a_result_media.info()}"
            )
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=MediaModel(
                public_id=a_result_media.result().public_id,
                id=a_result_media.result().id,
                provider_id=a_result_media.result().provider_id,
            ),
        )

    @staticmethod
    async def get_song_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BaseSongWithAlbumResponse]:
        """Get a song by public_id, dispatching to the matched provider."""

        a_result_song: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.SONG],
            )
        )
        if a_result_song.is_not_ok():
            logger.error(f"Error getting song from database. {a_result_song.info()}")
            return AResult(code=a_result_song.code(), message=a_result_song.message())

        song: CoreMediaRow = a_result_song.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            provider_id=song.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {song.provider_id}.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for song"
            )

        a_result: AResult[List[BaseSongWithAlbumResponse]] = (
            await provider.get_songs_async(session=session, public_ids=[public_id])
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting song. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result()[0])

    @staticmethod
    async def get_album_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BaseAlbumWithSongsResponse]:
        """Get an album by public_id, dispatching to the matched provider."""

        a_result_album: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.ALBUM],
            )
        )
        if a_result_album.is_not_ok():
            logger.error(
                f"Error getting album from database for public id {public_id}. {a_result_album.info()}"
            )
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album: CoreMediaRow = a_result_album.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            provider_id=album.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {album.provider_id}.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for album"
            )

        a_result: AResult[List[BaseAlbumWithSongsResponse]] = (
            await provider.get_albums_async(session=session, public_ids=[public_id])
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting album. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result()[0])

    @staticmethod
    async def get_artist_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BaseArtistResponse]:
        """Get an artist by public_id, dispatching to the matched provider."""

        a_result_artist: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.ARTIST],
            )
        )
        if a_result_artist.is_not_ok():
            logger.error(
                f"Error getting artist from database. {a_result_artist.info()}"
            )
            return AResult(
                code=a_result_artist.code(), message=a_result_artist.message()
            )

        artist: CoreMediaRow = a_result_artist.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            artist.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {artist.provider_id}.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for artist"
            )

        a_result: AResult[List[BaseArtistResponse]] = await provider.get_artists_async(
            session=session, public_ids=[public_id]
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting artist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result()[0])

    @staticmethod
    async def get_playlist_with_medias_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> AResult[BasePlaylistWithMediasResponse]:
        """Get a playlist by public_id, dispatching to the matched provider."""

        a_result_playlist: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.PLAYLIST],
            )
        )
        if a_result_playlist.is_not_ok():
            logger.error(
                f"Error getting playlist from database. {a_result_playlist.info()}"
            )
            return AResult(
                code=a_result_playlist.code(), message=a_result_playlist.message()
            )

        playlist: CoreMediaRow = a_result_playlist.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            playlist.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {playlist.provider_id}.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for playlist"
            )

        a_result: AResult[List[BasePlaylistWithMediasResponse]] = (
            await provider.get_playlists_with_medias_async(
                session=session, user_id=user_id, public_ids=[public_id]
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting playlist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result()[0])

    @staticmethod
    async def get_playlist_without_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> AResult[BasePlaylistWithoutMediasResponse]:
        """Get a playlist by public_id, dispatching to the matched provider."""

        a_result_playlist: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.PLAYLIST],
            )
        )
        if a_result_playlist.is_not_ok():
            logger.error(
                f"Error getting playlist from database. {a_result_playlist.info()}"
            )
            return AResult(
                code=a_result_playlist.code(), message=a_result_playlist.message()
            )

        playlist: CoreMediaRow = a_result_playlist.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            playlist.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {playlist.provider_id}.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for playlist"
            )

        a_result: AResult[List[BasePlaylistWithoutMediasResponse]] = (
            await provider.get_playlists_without_medias_async(
                session=session, user_id=user_id, public_ids=[public_id]
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting playlist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result()[0])

    @staticmethod
    async def search_async(
        session: AsyncSession, query: str
    ) -> AResult[SearchResultsResponse]:
        """Search all providers concurrently and aggregate results."""

        results: List[BaseSearchResultsItem] = []

        tasks: List[asyncio.Task[AResult[List[BaseSearchResultsItem]]]] = []

        for provider in providers.get_media_providers():
            a_result_id: AResult[int] = provider.get_id()
            if a_result_id.is_not_ok():
                logger.error(f"Skipping provider with no id. {a_result_id.info()}")
                continue

            # Schedule provider search
            task: asyncio.Task[AResult[List[BaseSearchResultsItem]]] = (
                asyncio.create_task(
                    provider.search_media_async(session=session, query=query)
                )
            )
            tasks.append(task)

        # Run all searches concurrently.
        search_results: List[AResult[List[BaseSearchResultsItem]]] = (
            await asyncio.gather(*tasks, return_exceptions=False)
        )

        # Collect results.
        for a_result in search_results:
            if a_result.is_not_ok():
                if a_result.code() != AResultCode.NOT_IMPLEMENTED:
                    logger.error(f"Provider search error. {a_result.info()}")
                continue

            results.extend(a_result.result())

        # Deduplicate: group by (type, name, artist names) — prefer downloaded items.
        seen: dict[tuple[str, str, tuple[str, ...]], BaseSearchResultsItem] = {}
        for item in results:
            artist_key: tuple[str, ...] = tuple(
                a.name.lower().strip() for a in item.artists
            )
            key: tuple[str, str, tuple[str, ...]] = (
                item.type,
                item.name.lower().strip(),
                artist_key,
            )

            existing = seen.get(key)
            if existing is None:
                seen[key] = item
            elif item.downloaded and not existing.downloaded:
                seen[key] = item

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=SearchResultsResponse(results=list(seen.values())),
        )

    @staticmethod
    async def delete_media_async(session: AsyncSession, public_id: str) -> AResultCode:
        """Delete the media file for a media item so it can be downloaded again."""

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session, public_id=public_id, media_type_keys=None
            )
        )
        if a_result_media.is_not_ok():
            logger.error(
                f"Error getting media from database for public id {public_id}. {a_result_media.info()}"
            )
            return AResultCode(
                code=a_result_media.code(), message=a_result_media.message()
            )

        media: CoreMediaRow = a_result_media.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            media.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {media.provider_id}.")
            return AResultCode(
                code=AResultCode.NOT_FOUND, message="Provider not found for media"
            )

        a_result: AResultCode = await provider.delete_media_async(
            session=session, public_id=public_id
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error deleting media. {a_result.info()}")
            return AResultCode(code=a_result.code(), message=a_result.message())

        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def get_frame_async(
        session: AsyncSession, public_id: str, timestamp_ms: float
    ) -> AResult[bytes]:
        """Extract a single frame from a video at the given timestamp."""

        a_result_video: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.VIDEO],
            )
        )
        if a_result_video.is_not_ok():
            logger.error(
                f"Error getting video from database for public id {public_id}. {a_result_video.info()}"
            )
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        video: CoreMediaRow = a_result_video.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            video.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {video.provider_id}.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for video"
            )

        a_result: AResult[bytes] = await provider.get_frame_async(
            session=session, public_id=public_id, timestamp_ms=timestamp_ms
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting video frame. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_image_async(
        session: AsyncSession, public_id: str
    ) -> AResult[ImageRow]:
        """Get an image by public_id."""

        a_result_image: AResult[ImageRow] = (
            await MediaAccess.get_image_from_public_id_async(
                session=session, public_id=public_id
            )
        )
        if a_result_image.is_not_ok():
            logger.error(f"Error getting image from database. {a_result_image.info()}")
            return AResult(code=a_result_image.code(), message=a_result_image.message())

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_image.result()
        )

    @staticmethod
    async def get_video_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BaseVideoResponse]:
        """Get a video by public_id, dispatching to the matched provider."""

        a_result_video: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.VIDEO],
            )
        )
        if a_result_video.is_not_ok():
            logger.error(
                f"Error getting video from database for public id {public_id}. {a_result_video.info()}"
            )
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        video: CoreMediaRow = a_result_video.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            video.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {video.provider_id}.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for video"
            )

        a_result: AResult[List[BaseVideoResponse]] = await provider.get_videos_async(
            session=session, public_ids=[public_id]
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting video. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result()[0])

    @staticmethod
    async def get_station_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BaseStationResponse]:
        """Get a station by public_id, dispatching to the matched provider."""

        a_result_station: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.RADIO],
            )
        )
        if a_result_station.is_not_ok():
            logger.error(
                f"Error getting station from database for public id {public_id}. {a_result_station.info()}"
            )
            return AResult(
                code=a_result_station.code(), message=a_result_station.message()
            )

        station: CoreMediaRow = a_result_station.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            station.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {station.provider_id}.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for station"
            )

        a_result: AResult[List[BaseStationResponse]] = (
            await provider.get_stations_async(session=session, public_ids=[public_id])
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting station. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result()[0])

    @staticmethod
    async def get_media_async(
        session: AsyncSession, public_id: str, user_id: int = 0
    ) -> AResult[MediaResponse]:
        """Get a media item by public_id without specifying type. Returns song, album, artist, playlist, or video."""

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session, public_id=public_id, media_type_keys=None
            )
        )
        if a_result_media.is_not_ok():
            logger.error(
                f"Error getting media from database for public id {public_id}. {a_result_media.info()}"
            )
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media: CoreMediaRow = a_result_media.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            media.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {media.provider_id}.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for media"
            )

        media_type: MediaTypeEnum = MediaTypeEnum(media.media_type_key)

        if media_type == MediaTypeEnum.SONG:
            a_result = await provider.get_songs_async(
                session=session, public_ids=[public_id]
            )
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        elif media_type == MediaTypeEnum.ALBUM:
            a_result = await provider.get_albums_async(
                session=session, public_ids=[public_id]
            )
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        elif media_type == MediaTypeEnum.ARTIST:
            a_result = await provider.get_artists_async(
                session=session, public_ids=[public_id]
            )
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        elif media_type == MediaTypeEnum.PLAYLIST:
            a_result = await provider.get_playlists_with_medias_async(
                session=session, user_id=user_id, public_ids=[public_id]
            )
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        elif media_type == MediaTypeEnum.VIDEO:
            a_result = await provider.get_videos_async(
                session=session, public_ids=[public_id]
            )
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        elif media_type == MediaTypeEnum.RADIO:
            a_result = await provider.get_stations_async(
                session=session, public_ids=[public_id]
            )
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        logger.error(f"Unknown media type: {media_type}")
        return AResult(code=AResultCode.NOT_FOUND, message="Unknown media type")
