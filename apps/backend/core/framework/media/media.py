import asyncio
from logging import Logger
from typing import TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from core.access.mediaAccess import MediaAccess
from core.aResult import AResult, AResultCode
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework import providers
from core.framework.models.media import MediaModel
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.responses.audioBoundsResponse import AudioBoundsResponse
from core.responses.mediaResponse import MediaResponse
from core.responses.searchResponse import (
    BaseSearchResultsItem,
    SearchResultsResponse,
)
from logger import getLogger

# Measurement-only counter of provider search calls since process start,
# used to prove the discovery redesign does not add provider requests.
_module_search_call_count: int = 0


logger: Logger = getLogger(__name__)

TMedia = TypeVar("TMedia")


class Media:
    @staticmethod
    def _extract_first_async_result(
        a_result: AResult[list[TMedia]],
        media_name: str,
    ) -> AResult[TMedia]:
        """Extract the first element of a list result, or return NOT_FOUND if empty."""

        items = a_result.result()
        if not items:
            logger.error(f"No {media_name} returned by provider.")
            return AResult(code=AResultCode.NOT_FOUND, message=f"{media_name} not found")
        return AResult(code=AResultCode.OK, message="OK", result=items[0])

    @staticmethod
    async def get_medias_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
        media_type_keys: list[MediaTypeEnum] | None,
    ) -> AResult[list[MediaModel]]:
        """Get multiple media items from the database by their public IDs."""

        a_result: AResult[list[CoreMediaRow]] = await MediaAccess.get_medias_from_public_ids_async(
            session=session, public_ids=public_ids, media_type_keys=media_type_keys
        )

        if a_result.is_not_ok():
            logger.error(
                f"Error getting medias from database for public ids {public_ids}. {a_result.info()}"
            )
            return AResult(code=a_result.code(), message=a_result.message())

        result: list[MediaModel] = [
            MediaModel(
                public_id=media.public_id,
                id=media.id,
                provider_id=media.provider_id,
            )
            for media in a_result.result()
        ]

        return AResult(code=AResultCode.OK, message="OK", result=result)

    @staticmethod
    async def resolve_songs_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
    ) -> list[BaseSongWithAlbumResponse]:
        """Resolve song public_ids to full song responses, dispatching each
        one to its owning provider (batched per provider). Order follows
        public_ids; unresolvable ids are silently dropped."""

        if not public_ids:
            return []

        a_medias: AResult[list[MediaModel]] = await Media.get_medias_from_public_ids_async(
            session=session,
            public_ids=list(dict.fromkeys(public_ids)),
            media_type_keys=[MediaTypeEnum.SONG],
        )
        if a_medias.is_not_ok():
            logger.error(f"Error resolving songs from public ids. {a_medias.info()}")
            return []
        if not a_medias.result():
            return []

        medias: list[MediaModel] = a_medias.result()
        pid_to_provider: dict[str, int] = {m.public_id: m.provider_id for m in medias}

        by_provider: dict[int, list[str]] = {}
        for pid in public_ids:
            pid_int = pid_to_provider.get(pid)
            if pid_int is not None:
                by_provider.setdefault(pid_int, []).append(pid)

        result_map: dict[str, BaseSongWithAlbumResponse] = {}
        for provider_id, pids in by_provider.items():
            provider: BaseMediaProvider | None = providers.find_media_provider(provider_id)
            local_only = provider is None
            if local_only:
                provider = providers.find_local_media_provider(provider_id=provider_id)
            if provider is None:
                logger.warning(f"No media provider found for provider_id {provider_id}")
                continue
            a_songs: AResult[list[BaseSongWithAlbumResponse]] = (
                await provider.get_local_songs_async(session=session, public_ids=pids)
                if local_only
                else await provider.get_songs_async(session=session, public_ids=pids)
            )
            if a_songs.is_not_ok():
                logger.error(
                    f"Provider {provider_id} error resolving {len(pids)} songs: {a_songs.info()}"
                )
                continue
            for song in a_songs.result():
                result_map[song.publicId] = song

        return [result_map[pid] for pid in public_ids if pid in result_map]

    @staticmethod
    async def get_media_from_public_id_async(
        session: AsyncSession,
        public_id: str,
        media_type_keys: list[MediaTypeEnum] | None,
    ) -> AResult[MediaModel]:
        """Get a single media item from the database by its public ID."""

        a_result_media: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=media_type_keys
        )

        if a_result_media.is_not_ok():
            logger.error(
                f"Error getting media from database for public id {public_id}. "
                f"{a_result_media.info()}"
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
    async def get_audio_bounds_async(
        session: AsyncSession, public_id: str
    ) -> AResult[AudioBoundsResponse]:
        """Dispatch optional boundary analysis without source-specific storage."""
        result = await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=[MediaTypeEnum.SONG]
        )
        if result.is_not_ok():
            logger.error(f"Could not resolve song. {result.info()}")
            return AResult(code=result.code(), message=result.message())
        song = result.result()
        provider = providers.find_media_provider(provider_id=song.provider_id)
        if provider is None:
            logger.warning("Audio boundary provider unavailable")
            return AResult(
                code=AResultCode.OK, message="OK", result=AudioBoundsResponse()
            )
        return await provider.get_audio_bounds_async(session=session, media_id=song.id)

    @staticmethod
    async def get_song_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BaseSongWithAlbumResponse]:
        """Get a song by public_id, dispatching to the matched provider."""

        a_result_song: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.SONG],
        )
        if a_result_song.is_not_ok():
            logger.error(f"Error getting song from database. {a_result_song.info()}")
            return AResult(code=a_result_song.code(), message=a_result_song.message())

        song: CoreMediaRow = a_result_song.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            provider_id=song.provider_id
        )
        local_only = provider is None
        if local_only:
            provider = providers.find_local_media_provider(provider_id=song.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {song.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for song")

        a_result: AResult[list[BaseSongWithAlbumResponse]] = (
            await provider.get_local_songs_async(session=session, public_ids=[public_id])
            if local_only
            else await provider.get_songs_async(session=session, public_ids=[public_id])
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting song. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return Media._extract_first_async_result(a_result=a_result, media_name="song")

    @staticmethod
    async def get_album_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BaseAlbumWithSongsResponse]:
        """Get an album by public_id, dispatching to the matched provider."""

        a_result_album: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.ALBUM],
        )
        if a_result_album.is_not_ok():
            logger.error(
                f"Error getting album from database for public id {public_id}. "
                f"{a_result_album.info()}"
            )
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album: CoreMediaRow = a_result_album.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(
            provider_id=album.provider_id
        )
        if provider is None:
            logger.error(f"No provider found for provider_id {album.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for album")

        a_result: AResult[list[BaseAlbumWithSongsResponse]] = await provider.get_albums_async(
            session=session, public_ids=[public_id]
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting album. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return Media._extract_first_async_result(a_result=a_result, media_name="album")

    @staticmethod
    async def get_artist_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BaseArtistResponse]:
        """Get an artist by public_id, dispatching to the matched provider."""

        a_result_artist: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.ARTIST],
        )
        if a_result_artist.is_not_ok():
            logger.error(f"Error getting artist from database. {a_result_artist.info()}")
            return AResult(code=a_result_artist.code(), message=a_result_artist.message())

        artist: CoreMediaRow = a_result_artist.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(artist.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {artist.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for artist")

        a_result: AResult[list[BaseArtistResponse]] = await provider.get_artists_async(
            session=session, public_ids=[public_id]
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting artist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return Media._extract_first_async_result(a_result=a_result, media_name="artist")

    @staticmethod
    async def get_playlist_with_medias_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> AResult[BasePlaylistWithMediasResponse]:
        """Get a playlist by public_id, dispatching to the matched provider."""

        a_result_playlist: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.PLAYLIST],
        )
        if a_result_playlist.is_not_ok():
            logger.error(f"Error getting playlist from database. {a_result_playlist.info()}")
            return AResult(code=a_result_playlist.code(), message=a_result_playlist.message())

        playlist: CoreMediaRow = a_result_playlist.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(playlist.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {playlist.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for playlist")

        a_result: AResult[
            list[BasePlaylistWithMediasResponse]
        ] = await provider.get_playlists_with_medias_async(
            session=session, user_id=user_id, public_ids=[public_id]
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting playlist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return Media._extract_first_async_result(a_result=a_result, media_name="playlist")

    @staticmethod
    async def get_playlist_without_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> AResult[BasePlaylistWithoutMediasResponse]:
        """Get a playlist by public_id, dispatching to the matched provider."""

        a_result_playlist: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.PLAYLIST],
        )
        if a_result_playlist.is_not_ok():
            logger.error(f"Error getting playlist from database. {a_result_playlist.info()}")
            return AResult(code=a_result_playlist.code(), message=a_result_playlist.message())

        playlist: CoreMediaRow = a_result_playlist.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(playlist.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {playlist.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for playlist")

        a_result: AResult[
            list[BasePlaylistWithoutMediasResponse]
        ] = await provider.get_playlists_without_medias_async(
            session=session, user_id=user_id, public_ids=[public_id]
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting playlist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return Media._extract_first_async_result(a_result=a_result, media_name="playlist")

    @staticmethod
    def get_provider_search_call_count() -> int:
        """Number of provider searches performed since process start.

        Measurement only — used to show the discovery redesign renders without
        provider requests and downloads resolve in a single search.
        """

        return _module_search_call_count

    @staticmethod
    async def search_async(session: AsyncSession, query: str) -> AResult[SearchResultsResponse]:
        """Search all providers concurrently and aggregate results."""

        global _module_search_call_count
        _module_search_call_count += 1

        results: list[BaseSearchResultsItem] = []

        from core.framework.media.search import provider_search

        if len(query.strip()) < 2:
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=SearchResultsResponse(results=[]),
            )
        search_results = await asyncio.gather(
            *[
                provider_search.search_async(provider_id=entry.id, query=query)
                for entry in provider_search.catalog().providers
            ]
        )
        for a_result in search_results:
            if a_result.is_not_ok():
                logger.error(f"Provider search error. {a_result.info()}")
                continue
            results.extend(a_result.result().results)

        # Deduplicate: group by (type, name, artist names) — prefer downloaded items.
        seen: dict[tuple[str, str, tuple[str, ...]], BaseSearchResultsItem] = {}
        for item in results:
            artist_key: tuple[str, ...] = tuple(a.name.lower().strip() for a in item.artists)
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
    async def delete_media_file_async(session: AsyncSession, public_id: str) -> AResultCode:
        """Delete the media file for a media item so it can be downloaded again."""

        a_result_media: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=None
        )
        if a_result_media.is_not_ok():
            logger.error(
                f"Error getting media from database for public id {public_id}. "
                f"{a_result_media.info()}"
            )
            return AResultCode(code=a_result_media.code(), message=a_result_media.message())

        media: CoreMediaRow = a_result_media.result()
        if MediaTypeEnum(media.media_type_key) == MediaTypeEnum.SONG:
            song_result = await Media.get_song_async(session=session, public_id=public_id)
            if song_result.is_not_ok():
                logger.error(f"Local song resolution failed. {song_result.info()}")
                return AResult(code=song_result.code(), message=song_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=song_result.result()),
            )
        provider: BaseMediaProvider | None = providers.find_media_provider(media.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {media.provider_id}.")
            return AResultCode(code=AResultCode.NOT_FOUND, message="Provider not found for media")

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

        a_result_video: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.VIDEO],
        )
        if a_result_video.is_not_ok():
            logger.error(
                f"Error getting video from database for public id {public_id}. "
                f"{a_result_video.info()}"
            )
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        video: CoreMediaRow = a_result_video.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(video.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {video.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for video")

        a_result: AResult[bytes] = await provider.get_frame_async(
            session=session, public_id=public_id, timestamp_ms=timestamp_ms
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting video frame. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_image_async(session: AsyncSession, public_id: str) -> AResult[ImageRow]:
        """Get an image by public_id."""

        a_result_image: AResult[ImageRow] = await MediaAccess.get_image_from_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_image.is_not_ok():
            logger.error(f"Error getting image from database. {a_result_image.info()}")
            return AResult(code=a_result_image.code(), message=a_result_image.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result_image.result())

    @staticmethod
    async def get_video_async(session: AsyncSession, public_id: str) -> AResult[BaseVideoResponse]:
        """Get a video by public_id, dispatching to the matched provider."""

        a_result_video: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.VIDEO],
        )
        if a_result_video.is_not_ok():
            logger.error(
                f"Error getting video from database for public id {public_id}. "
                f"{a_result_video.info()}"
            )
            return AResult(code=a_result_video.code(), message=a_result_video.message())

        video: CoreMediaRow = a_result_video.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(video.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {video.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for video")

        a_result: AResult[list[BaseVideoResponse]] = await provider.get_videos_async(
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

        a_result_station: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.RADIO],
        )
        if a_result_station.is_not_ok():
            logger.error(
                f"Error getting station from database for public id {public_id}. "
                f"{a_result_station.info()}"
            )
            return AResult(code=a_result_station.code(), message=a_result_station.message())

        station: CoreMediaRow = a_result_station.result()
        provider: BaseMediaProvider | None = providers.find_media_provider(station.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {station.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for station")

        a_result: AResult[list[BaseStationResponse]] = await provider.get_stations_async(
            session=session, public_ids=[public_id]
        )
        if a_result.is_not_ok():
            logger.error(f"Provider error getting station. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result()[0])

    @staticmethod
    async def get_media_async(
        session: AsyncSession, public_id: str, user_id: int = 0
    ) -> AResult[MediaResponse]:
        """
        Get a media item by public_id without specifying type. Returns song, album, artist,
        playlist, or video.
        """

        a_result_media: AResult[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=None
        )
        if a_result_media.is_not_ok():
            logger.error(
                f"Error getting media from database for public id {public_id}. "
                f"{a_result_media.info()}"
            )
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media: CoreMediaRow = a_result_media.result()
        if MediaTypeEnum(media.media_type_key) == MediaTypeEnum.SONG:
            song_result = await Media.get_song_async(session=session, public_id=public_id)
            if song_result.is_not_ok():
                logger.error(f"Local song resolution failed. {song_result.info()}")
                return AResult(code=song_result.code(), message=song_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=song_result.result()),
            )
        provider: BaseMediaProvider | None = providers.find_media_provider(media.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {media.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for media")

        media_type: MediaTypeEnum = MediaTypeEnum(media.media_type_key)

        if media_type == MediaTypeEnum.SONG:
            a_result = await provider.get_songs_async(session=session, public_ids=[public_id])
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        elif media_type in (MediaTypeEnum.ALBUM, MediaTypeEnum.PLAYLIST):
            from core.framework.media.collection import Collection

            collection = await Collection.metadata_async(
                session=session, public_id=public_id, user_id=user_id
            )
            if collection.is_not_ok():
                logger.error(f"Error getting collection metadata. {collection.info()}")
                return AResult(code=collection.code(), message=collection.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=collection.result()),
            )

        elif media_type == MediaTypeEnum.ARTIST:
            a_result = await provider.get_artists_async(session=session, public_ids=[public_id])
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        elif media_type == MediaTypeEnum.VIDEO:
            a_result = await provider.get_videos_async(session=session, public_ids=[public_id])
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        elif media_type == MediaTypeEnum.RADIO:
            a_result = await provider.get_stations_async(session=session, public_ids=[public_id])
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaResponse(media=a_result.result()[0]),
            )

        logger.error(f"Unknown media type: {media_type}")
        return AResult(code=AResultCode.NOT_FOUND, message="Unknown media type")
