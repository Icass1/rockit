from __future__ import annotations

from logging import Logger
from typing import TYPE_CHECKING, List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

# Core framework.
if TYPE_CHECKING:
    from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.provider.types import AddFromUrlAResult

# Core responses.
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse

logger: Logger = getLogger(__name__)


class BaseProvider:
    _id: int
    _name: str

    def set_info(self, provider_id: int, provider_name: str):
        """TODO"""
        self._id = provider_id
        self._name = provider_name

    async def async_init(self, session: AsyncSession):
        logger.debug(f"Provider {self} does not implement async_int")
        """TODO"""

    def get_id(self) -> AResult[int]:
        """TODO"""
        try:
            return AResult(code=AResultCode.OK, message="OK", result=self._id)
        except:
            logger.error("Error getting provider id.")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting provider id"
            )

    def get_name(self):
        """TODO"""
        return self._name

    def start_download(self, publicId: str) -> AResult[BaseDownload]:
        logger.warning(
            f"Provider '{self._name} doesn't implement start_download method.'"
        )
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement start_download method.'",
        )

    async def start_download_async(
        self,
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> AResult[BaseDownload]:
        """Create a BaseDownload for the given song. Override in provider-specific subclasses."""

        logger.warning(
            f"Provider '{self._name}' doesn't implement start_download_async method."
        )
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement start_download_async method.",
        )

    async def search_async(self, query: str) -> AResult[List[BaseSearchResultsItem]]:
        """TODO"""
        logger.warning(f"Provider '{self._name} doesn't implement search method.'")
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement search_async method.'",
        )

    async def get_song_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BaseSongWithAlbumResponse]:
        """TODO"""
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement get_song_async method. Trying to get song with public_id: {public_id}'",
        )

    async def get_album_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BaseAlbumWithSongsResponse]:
        """"""
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement get_album_async method.'",
        )

    async def get_artist_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BaseArtistResponse]:
        """"""
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement get_artist_async method.'",
        )

    async def get_playlist_async(
        self, session: AsyncSession, user_id: int, public_id: str
    ) -> AResult[BasePlaylistResponse]:
        """"""
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement get_playlist_async method.'",
        )

    async def get_video_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BaseVideoResponse]:
        """"""
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_video_async method.",
        )

    def match_url(self, url: str) -> str | None:
        """Check if the given URL matches this provider and return the internal path.

        Returns the internal path (e.g., '/spotify/track/{id}') if the URL matches,
        or None if it doesn't match this provider.
        """
        return None

    async def add_from_url_async(
        self, session: AsyncSession, url: str
    ) -> AResult[AddFromUrlAResult]:
        """Add media from a URL to the database.

        Takes an external URL, adds the media to the database,
        and returns the created media object.
        """
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement add_from_url_async.",
        )
