from __future__ import annotations

from logging import Logger
from typing import TYPE_CHECKING, List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)

# Core framework.
if TYPE_CHECKING:
    from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.provider.types import AddFromUrlAResult

# Core responses.
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse

logger: Logger = getLogger(__name__)


class BaseProvider:
    _id: int
    _name: str

    def set_info(self, provider_id: int, provider_name: str):
        self._id = provider_id
        self._name = provider_name

    async def async_init(self, session: AsyncSession):
        logger.debug(f"Provider {self} does not implement async_init")

    def get_id(self) -> AResult[int]:
        try:
            return AResult(code=AResultCode.OK, message="OK", result=self._id)
        except:
            logger.error("Error getting provider id.")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting provider id"
            )

    def get_name(self):
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
        logger.warning(
            f"Provider '{self._name}' doesn't implement start_download_async method."
        )
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement start_download_async method.",
        )

    async def search_async(self, query: str) -> AResult[List[BaseSearchResultsItem]]:
        logger.warning(f"Provider '{self._name} doesn't implement search method.'")
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement search_async method.'",
        )

    async def get_songs_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseSongWithAlbumResponse]]:
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_songs_async.",
        )

    async def get_albums_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseAlbumWithSongsResponse]]:
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_albums_async.",
        )

    async def get_artists_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseArtistResponse]]:
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_artists_async.",
        )

    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithoutMediasResponse]]:
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_playlists_async.",
        )

    async def get_playlists_with_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithMediasResponse]]:
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_playlists_async.",
        )

    async def get_videos_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseVideoResponse]]:
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_videos_async.",
        )

    def match_url(self, url: str) -> str | None:
        return None

    async def add_from_url_async(
        self, session: AsyncSession, url: str
    ) -> AResult[AddFromUrlAResult]:
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement add_from_url_async.",
        )

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_media_duration_ms_async.",
        )
