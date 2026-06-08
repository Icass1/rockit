from __future__ import annotations

import os
from logging import Logger
from typing import TYPE_CHECKING, List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework.provider.types import AddFromUrlAResult

from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse

if TYPE_CHECKING:
    from backend.core.framework.downloader.baseDownload import BaseDownload

logger: Logger = getLogger(__name__)


class BaseMediaProvider(BaseProvider):
    """Base class for media providers (Spotify, YouTube, etc.)."""

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

    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> AResult[List[BaseSearchResultsItem]]:
        logger.warning(
            f"Provider '{self._name} doesn't implement search_media_async method.'"
        )
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement search_media_async method.'",
        )

    def match_url(self, url: str) -> str | None:
        return None

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

    async def get_stations_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseStationResponse]]:
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_stations_async.",
        )

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

    async def delete_media_async(
        self, session: AsyncSession, public_id: str
    ) -> AResultCode:
        """Remove the audio file for a media item and reset its path in the database
        so it can be downloaded again."""

        logger.warning(
            f"Provider '{self._name}' doesn't implement delete_media_async method."
        )
        return AResultCode(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement delete_media_async method.",
        )

    @staticmethod
    def _rename_file_to_backup(file_path: str) -> None:
        """Rename a file by appending .bak<n> where n is the next available number.

        If the file does not exist, this is a no-op.
        """

        if not os.path.exists(file_path):
            return

        n: int = 1
        while os.path.exists(f"{file_path}.bak{n}"):
            n += 1

        os.rename(file_path, f"{file_path}.bak{n}")

    # ------------------------------------------------------------------
    # Stats CTE fragments
    # Each method returns a bare SELECT … block (no CTE name, no UNION ALL)
    # that will be combined with other providers' fragments via UNION ALL.
    # Return None if the provider has no contribution for that CTE.
    # ------------------------------------------------------------------

    def get_stats_media_info_cte_fragment(self) -> str | None:
        """SELECT fragment for media_info (media_id, duration_ms, public_id, media_name, image_url, media_type_key)."""
        return None

    def get_stats_artist_info_cte_fragment(self) -> str | None:
        """SELECT fragment for artist_info (media_id, artist_public_id, artist_name, artist_image_url)."""
        return None

    def get_stats_album_info_cte_fragment(self) -> str | None:
        """SELECT fragment for album_info (media_id, album_public_id, album_name, album_image_url)."""
        return None
