from __future__ import annotations

from logging import Logger
from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.provider.baseProvider import BaseProvider
from core.framework.provider.types import AddFromUrlResult
from core.responses.artistPageResponse import ArtistCatalogResponse
from core.responses.audioBoundsResponse import AudioBoundsResponse
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
from core.responses.searchResponse import BaseSearchResultsItem
from logger import getLogger
from result import Result, ResultCode

if TYPE_CHECKING:
    from core.framework.downloader.baseDownload import BaseDownload


from core.framework.models.localSong import LocalSong

logger: Logger = getLogger(__name__)


class BaseMediaProvider(BaseProvider):
    """Shared contract for media providers."""

    async def find_local_songs_async(
        self, session: AsyncSession, titles: list[str]
    ) -> Result[list[LocalSong]]:
        """Read downloaded song metadata without consulting any remote service."""
        return Result(code=ResultCode.OK, message="OK", result=[])

    async def get_local_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseSongWithAlbumResponse]]:
        """Local playback capability, including when remote integration is disabled."""
        return Result(code=ResultCode.OK, message="OK", result=[])

    async def get_audio_bounds_async(
        self, session: AsyncSession, media_id: int
    ) -> Result[AudioBoundsResponse]:
        """Optional capability for seekable local songs; unsupported sources play normally."""
        return Result(code=ResultCode.OK, message="OK", result=AudioBoundsResponse())

    async def get_artist_catalog_async(
        self, session: AsyncSession, name: str, public_id: str | None = None
    ) -> Result[ArtistCatalogResponse]:
        """Return locally indexed references. Unsupported sources contribute nothing."""
        return Result(code=ResultCode.OK, message="OK", result=ArtistCatalogResponse())

    def start_download(self, publicId: str) -> Result[BaseDownload]:
        logger.warning(f"Provider '{self._name} doesn't implement start_download method.'")
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement start_download method.'",
        )

    async def start_download_async(
        self,
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> Result[BaseDownload]:
        logger.warning(f"Provider '{self._name}' doesn't implement start_download_async method.")
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement start_download_async method.",
        )

    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> Result[list[BaseSearchResultsItem]]:
        logger.warning(f"Provider '{self._name} doesn't implement search_media_async method.'")
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name} doesn't implement search_media_async method.'",
        )

    async def search_page_async(
        self,
        session: AsyncSession,
        query: str,
        limit: int = 15,
        media_type: str | None = None,
    ) -> Result[list[BaseSearchResultsItem]]:
        """Providers without pagination return their complete supported result set."""
        return await self.search_media_async(session=session, query=query)

    def search_on_demand(self) -> bool:
        return False

    def search_supports_category(self) -> bool:
        return False

    def search_page_size(self) -> int:
        """Zero means that expanding search is unsupported."""
        return 0

    def match_url(self, url: str) -> str | None:
        return None

    async def get_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseSongWithAlbumResponse]]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_songs_async.",
        )

    async def get_albums_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseAlbumWithSongsResponse]]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_albums_async.",
        )

    async def get_artists_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseArtistResponse]]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_artists_async.",
        )

    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> Result[list[BasePlaylistWithoutMediasResponse]]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_playlists_async.",
        )

    async def get_playlists_with_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> Result[list[BasePlaylistWithMediasResponse]]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_playlists_async.",
        )

    async def get_videos_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseVideoResponse]]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_videos_async.",
        )

    async def get_stations_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseStationResponse]]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_stations_async.",
        )

    async def add_from_url_async(self, session: AsyncSession, url: str) -> Result[AddFromUrlResult]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement add_from_url_async.",
        )

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> Result[int]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_media_duration_ms_async.",
        )

    async def delete_media_async(self, session: AsyncSession, public_id: str) -> ResultCode:
        """Remove the audio file for a media item and reset its path in the database
        so it can be downloaded again."""

        logger.warning(f"Provider '{self._name}' doesn't implement delete_media_async method.")
        return ResultCode(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement delete_media_async method.",
        )

    async def get_frame_async(
        self,
        session: AsyncSession,
        public_id: str,
        timestamp_ms: float,
    ) -> Result[bytes]:
        """Extract a single frame from a video at the given timestamp in miliseconds.

        Returns the image data as bytes (WEBP).
        """

        logger.warning(f"Provider '{self._name}' doesn't implement get_frame_async method.")
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement get_frame_async method.",
        )

    # ------------------------------------------------------------------
    # Stats CTE fragments
    # Each method returns a bare SELECT … block (no CTE name, no UNION ALL)
    # that will be combined with other providers' fragments via UNION ALL.
    # Return None if the provider has no contribution for that CTE.
    # ------------------------------------------------------------------

    def get_recommendation_playlist_edges_cte_fragment(self) -> str | None:
        """SELECT playlist_id, media_id for playlist co-occurrence ranking."""
        return None

    def get_stats_media_info_cte_fragment(self) -> str | None:
        """
        SELECT fragment for media_info (media_id, duration_ms, public_id, media_name,
        image_url, media_type_key).
        """
        return None

    def get_stats_artist_info_cte_fragment(self) -> str | None:
        """
        SELECT fragment for artist_info (media_id, artist_public_id, artist_name,
        artist_image_url).
        """
        return None

    def get_stats_album_info_cte_fragment(self) -> str | None:
        """SELECT fragment for album_info, including image ID and artist names."""
        return None

    def get_stats_genre_info_cte_fragment(self) -> str | None:
        """SELECT fragment for genre_info (media_id, genre_name).

        A media item may produce multiple rows (multiple artists, each with
        multiple genres). Return None if the provider has no genre data.
        """
        return None

    def get_collection_provider_url(self, metadata: dict[str, Any], media_type_key: int) -> str:
        """Build the provider-owned link for unloaded album or playlist metadata."""
        return str(metadata.get("provider_url", ""))

    def get_search_index_cte_fragment(self) -> str | None:
        """SELECT fragment for search_index.

        Columns: internal_id, public_id, name, subtitle, media_type_key,
        provider_name, image_url.

        The subtitle column carries the item's related context (e.g. artist /
        channel / album names for songs, albums and videos; NULL otherwise). It
        is matched by the admin fuzzy-search and shown alongside the item name.

        Used by the admin fuzzy-search feature to build a full index of every
        searchable media item across all providers. Return None if the provider
        has no contribution.
        """
        return None

    def can_manage_downloads(self) -> bool:
        return False

    async def add_media_to_playlist_async(
        self,
        session: AsyncSession,
        playlist_public_id: str,
        user_id: int,
        media_public_id: str,
    ) -> Result[Any]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message="This provider does not support playlist editing",
        )

    async def set_media_expanded_async(
        self,
        session: AsyncSession,
        user_id: int,
        playlist_public_id: str,
        media_public_id: str,
        is_expanded: bool,
    ) -> Result[bool]:
        return Result(
            code=ResultCode.NOT_IMPLEMENTED,
            message="This provider does not support expanded playlist items",
        )
