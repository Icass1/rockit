from typing import List

from logging import Logger

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.db.ormModels.song import CoreSongRow
from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.artist import CoreArtistRow
from backend.core.access.db.ormModels.playlist import CorePlaylistRow

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework.providers.providers import Providers

from backend.core.responses.baseSongResponse import BaseSongResponse
from backend.core.responses.baseAlbumResponse import BaseAlbumResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.searchResponse import BaseSearchItem, ProviderSearchResponse

logger: Logger = getLogger(__name__)


class Media:
    @staticmethod
    async def get_song_async(public_id: str, providers: Providers) -> AResult[BaseSongResponse]:
        """Get a song by public_id, dispatching to the matched provider."""

        a_result_song: AResult[CoreSongRow] = await MediaAccess.get_song_from_public_id_async(public_id)
        if a_result_song.is_not_ok():
            logger.error(f"Error getting song from database. {a_result_song.info()}")
            return AResult(code=a_result_song.code(), message=a_result_song.message())

        song: CoreSongRow = a_result_song.result()
        provider: BaseProvider | None = providers.find_provider(provider_id=song.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {song.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for song")

        a_result: AResult[BaseSongResponse] = await provider.get_song_async(public_id)
        if a_result.is_not_ok():
            logger.error(f"Provider error getting song. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_album_async(public_id: str, providers: Providers) -> AResult[BaseAlbumResponse]:
        """Get an album by public_id, dispatching to the matched provider."""

        a_result_album: AResult[CoreAlbumRow] = await MediaAccess.get_album_from_public_id_async(public_id)
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album from database. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album: CoreAlbumRow = a_result_album.result()
        provider: BaseProvider | None = providers.find_provider(album.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {album.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for album")

        a_result: AResult[BaseAlbumResponse] = await provider.get_album_async(public_id=public_id)
        if a_result.is_not_ok():
            logger.error(f"Provider error getting album. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_artist_async(public_id: str, providers: Providers) -> AResult[BaseArtistResponse]:
        """Get an artist by public_id, dispatching to the matched provider."""

        a_result_artist: AResult[CoreArtistRow] = await MediaAccess.get_artist_from_public_id_async(public_id)
        if a_result_artist.is_not_ok():
            logger.error(f"Error getting artist from database. {a_result_artist.info()}")
            return AResult(code=a_result_artist.code(), message=a_result_artist.message())

        artist: CoreArtistRow = a_result_artist.result()
        provider: BaseProvider | None = providers.find_provider(artist.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {artist.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for artist")

        a_result: AResult[BaseArtistResponse] = await provider.get_artist_async(public_id)
        if a_result.is_not_ok():
            logger.error(f"Provider error getting artist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_playlist_async(public_id: str, providers: Providers) -> AResult[BasePlaylistResponse]:
        """Get a playlist by public_id, dispatching to the matched provider."""

        a_result_playlist: AResult[CorePlaylistRow] = await MediaAccess.get_playlist_from_public_id_async(public_id)
        if a_result_playlist.is_not_ok():
            logger.error(f"Error getting playlist from database. {a_result_playlist.info()}")
            return AResult(code=a_result_playlist.code(), message=a_result_playlist.message())

        playlist: CorePlaylistRow = a_result_playlist.result()
        provider: BaseProvider | None = providers.find_provider(playlist.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {playlist.provider_id}.")
            return AResult(code=AResultCode.NOT_FOUND, message="Provider not found for playlist")

        a_result: AResult[BasePlaylistResponse] = await provider.get_playlist_async(public_id)
        if a_result.is_not_ok():
            logger.error(f"Provider error getting playlist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def search_async(query: str, providers: Providers) -> AResult[List[ProviderSearchResponse]]:
        """Search all providers and aggregate results into a ProviderSearchResponse list."""

        results: List[ProviderSearchResponse] = []

        for provider in providers.get_providers():
            a_result_id: AResult[int] = provider.get_id()
            if a_result_id.is_not_ok():
                logger.error(f"Skipping provider with no id. {a_result_id.info()}")
                continue

            a_result: AResult[List[BaseSearchItem]] = await provider.search_async(query)
            if a_result.is_not_ok():
                if a_result.code() != AResultCode.NOT_IMPLEMENTED:
                    logger.error(f"Provider search error. {a_result.info()}")
                continue

            results.append(ProviderSearchResponse(
                provider=provider.get_name(),
                items=a_result.result()))

        return AResult(code=AResultCode.OK, message="OK", result=results)
