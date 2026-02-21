from typing import Any, Dict, List

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.spotify.access.spotifyCacheAccess import SpotifyCacheAccess
from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum


logger = getLogger(__name__)


class SpotifyCache:
    @staticmethod
    async def get_albums_async(id: List[str]) -> AResult[RawSpotifyApiAlbum]:
        pass

    @staticmethod
    async def check_album_async(id: str) -> AResult[bool]:
        pass

    @staticmethod
    async def add_album_async(id: str, json: Dict[str, Any]) -> AResultCode:


        if a_result.is_not_ok():
            logger.info(f"Error adding album to cache. {a_result.info()}")
            return AResultCode(a_result.code(), message=a_result.message())

        return AResultCode(code=AResultCode.OK, message="OK")
