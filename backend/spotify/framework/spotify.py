from typing import List
from backend.spotify.framework.spotifyCache import SpotifyCache
from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.spotify.framework.spotifyApi import spotify_api

from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.spotify.access.spotifyAccess import SpotifyAccess

from backend.spotify.responses.albumResponse import AlbumResponse

logger = getLogger(__name__)


class Spotify:
    @staticmethod
    async def get_album_async(id: str) -> AResult[AlbumResponse]:
        a_result_album: AResult[AlbumRow] = await SpotifyAccess.get_album_async(id)
        if a_result_album.code() == AResultCode.NOT_FOUND:
            if a_result_cache_album.code() == AResultCode.NOT_FOUND:
                # Get album from Spotify, add response to cache and add Spotify album to database.
                a_result_api_album: AResult[List[RawSpotifyApiAlbum]] = await spotify_api.get_albums_async([id])
                if a_result_api_album.is_not_ok():
                    logger.error("Error getting album from Spotify API cache.")
                    return AResult(code=a_result_api_album.code(), message=a_result_api_album.message())

                if len(a_result_api_album.result()) != 1:
                    logger.error(
                        f"get_albums_async didn't return 1 album. Albums returned: {len(a_result_api_album.result())}.")
                    return AResult(code=AResultCode.GENERAL_ERROR, message=f"{len(a_result_api_album.result())} albums received instead of 1.")

                a_result_add_album_cache: AResultCode = await SpotifyCache.add_album_async(id, a_result_api_album.result()[0]._json)
                if a_result_add_album_cache.is_not_ok():
                    logger.error("Error adding album to cache")

            elif a_result_cache_album.is_not_ok():
                logger.error("Error getting album from Spotify cache.")
                return AResult(code=a_result_cache_album.code(), message=a_result_cache_album.message())
            else:
                logger.critical(
                    "Should add the album to database.")

        elif a_result_album.is_not_ok():
            logger.error("Error getting album from database.")
            return AResult(code=a_result_album.code(), message=a_result_album.message())
        else:
            logger.critical("Should convert AlbumRow to AlbumResponse.")

        return AResult(code=AResultCode.GENERAL_ERROR, message="TODO")

    async def get_songs():
        # Get all songs

        pass
