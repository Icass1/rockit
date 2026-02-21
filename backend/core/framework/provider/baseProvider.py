from logging import Logger
from typing import List
from backend.core.aResult import AResult, AResultCode
from backend.core.responses.baseAlbumResponse import BaseAlbumResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseSongResponse import BaseSongResponse
from backend.core.responses.searchResponse import BaseSearchItem
from backend.utils.logger import getLogger


logger: Logger = getLogger(__name__)


class BaseProvider:
    _id: int
    _name: str

    def set_info(self, provider_id: int, provider_name: str):
        """TODO"""
        self._id = provider_id
        self._name = provider_name

    async def async_init(self):
        logger.warning(f"Provider {self} does not implement async_int")
        """TODO"""

    def get_id(self) -> AResult[int]:
        """TODO"""
        try:
            return AResult(code=AResultCode.OK, message="OK", result=self._id)
        except:
            logger.error("Error getting provider id.")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting provider id")

    def get_name(self):
        """TODO"""
        return self._name

    async def search_async(self, query: str) -> AResult[List[BaseSearchItem]]:
        """TODO"""
        logger.warning(
            f"Provider '{self._name} doesn't implement search method.'")
        return AResult(code=AResultCode.NOT_IMPLEMENTED, message=f"Provider '{self._name} doesn't implement search_async method.'")

    async def get_song_async(self, public_id: str) -> AResult[BaseSongResponse]:
        """TODO"""
        return AResult(code=AResultCode.NOT_IMPLEMENTED, message=f"Provider '{self._name} doesn't implement get_song_async method.'")

    async def get_album_async(self, public_id: str) -> AResult[BaseAlbumResponse]:
        """"""
        return AResult(code=AResultCode.NOT_IMPLEMENTED, message=f"Provider '{self._name} doesn't implement get_album_async method.'")

    async def get_artist_async(self, public_id: str) -> AResult[BaseArtistResponse]:
        """"""
        return AResult(code=AResultCode.NOT_IMPLEMENTED, message=f"Provider '{self._name} doesn't implement get_artist_async method.'")

    async def get_playlist_async(self, public_id: str) -> AResult[BasePlaylistResponse]:
        """"""
        return AResult(code=AResultCode.NOT_IMPLEMENTED, message=f"Provider '{self._name} doesn't implement get_playlist_async method.'")
