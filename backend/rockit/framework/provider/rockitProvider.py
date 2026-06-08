from logging import Logger
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.provider.baseUploadProvider import BaseUploadProvider
from backend.core.framework.provider.types import AddFromUrlAResult

from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.uploadResponse import UploadResponse

from backend.core.requests.uploadSongRequest import UploadSongRequest
from backend.core.requests.uploadAlbumRequest import UploadAlbumRequest
from backend.core.requests.uploadVideoRequest import UploadVideoRequest

from backend.rockit.framework.rockit import Rockit

logger: Logger = getLogger(__name__)


class RockItProvider(BaseMediaProvider, BaseUploadProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        Rockit.provider_name = provider_name
        Rockit.provider_id = provider_id

        self._id = provider_id
        self._name = provider_name

    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> AResult[List[BaseSearchResultsItem]]:
        """Search RockIt uploaded media by name."""

        return await Rockit.search_async(session=session, query=query)

    async def get_songs_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseSongWithAlbumResponse]]:
        """Get RockIt songs by public IDs."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        return await Rockit.get_songs_responses_async(
            session=session, public_ids=public_ids
        )

    async def get_albums_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseAlbumWithSongsResponse]]:
        """Get RockIt albums by public IDs."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        return await Rockit.get_albums_responses_async(
            session=session, public_ids=public_ids
        )

    async def get_artists_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseArtistResponse]]:
        """Get RockIt artists. RockIt stores artist name as a string on songs/albums.

        Returns a simple artist response for each public_id.
        """

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="RockIt provider does not support standalone artist queries.",
        )

    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithoutMediasResponse]]:
        """RockIt does not support playlists."""

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="RockIt provider does not support playlists.",
        )

    async def get_playlists_with_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithMediasResponse]]:
        """RockIt does not support playlists."""

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="RockIt provider does not support playlists.",
        )

    async def get_videos_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseVideoResponse]]:
        """Get RockIt videos by public IDs."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        return await Rockit.get_videos_responses_async(
            session=session, public_ids=public_ids
        )

    async def add_from_url_async(
        self, session: AsyncSession, url: str
    ) -> AResult[AddFromUrlAResult]:
        """RockIt does not support adding media from external URLs."""

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="RockIt provider does not support adding from URLs.",
        )

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        """Get the duration of a RockIt song in milliseconds."""

        return await Rockit.get_media_duration_ms_async(
            session=session, public_id=public_id
        )

    async def start_download_async(
        self,
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> AResult[BaseDownload]:
        """RockIt files are already stored locally — no download needed."""

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="RockIt files are already stored locally.",
        )

    async def upload_song_async(
        self,
        session: AsyncSession,
        request: UploadSongRequest,
        file_path: str,
        image_path: str | None = None,
    ) -> AResult[UploadResponse]:
        """Upload a song file to the RockIt provider."""

        if image_path is None:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Image data is required for song upload.",
            )

        return await Rockit.upload_song_async(
            session=session,
            title=request.title,
            artist_names=request.artistNames,
            file_path=file_path,
            image_path=image_path,
            disc_number=request.discNumber,
            track_number=request.trackNumber,
        )

    async def upload_album_async(
        self,
        session: AsyncSession,
        request: UploadAlbumRequest,
        cover_path: str | None,
        song_paths: dict[str, str],
    ) -> AResult[UploadResponse]:
        """Upload an album with songs to the RockIt provider."""

        if cover_path is None:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Cover image data is required for album upload.",
            )

        return await Rockit.upload_album_async(
            session=session,
            title=request.title,
            artist_name=request.artistNames,
            song_titles=[s.title for s in request.songs],
            song_paths=song_paths,
            cover_path=cover_path,
            release_date=request.releaseDate,
        )

    async def upload_video_async(
        self,
        session: AsyncSession,
        request: UploadVideoRequest,
        file_path: str,
        image_path: str | None = None,
    ) -> AResult[UploadResponse]:
        """Upload a video file to the RockIt provider."""

        if image_path is None:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Image data is required for video upload.",
            )

        return await Rockit.upload_video_async(
            session=session,
            title=request.title,
            artist_names=request.artistNames,
            file_path=file_path,
            image_path=image_path,
        )

    def get_stats_media_info_cte_fragment(self) -> str | None:
        from backend.core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT cm.id                                          AS media_id,
           COALESCE(rs.duration_ms, 0)                    AS duration_ms,
           cm.public_id                                   AS public_id,
           rs.name                                        AS media_name,
           ci.url                                         AS image_url,
           {MediaTypeEnum.SONG.value}                     AS media_type_key
    FROM   rockit.song rs
    JOIN   core.media cm ON cm.id = rs.id
    JOIN   core.image ci ON ci.id = rs.image_id"""

    def get_stats_artist_info_cte_fragment(self) -> str | None:
        return """    SELECT rs.id           AS media_id,
           cm.public_id     AS artist_public_id,
           ra.name          AS artist_name,
           ci.url           AS artist_image_url
    FROM   rockit.song            rs
    JOIN   core.media             cm  ON cm.id = rs.id
    JOIN   rockit.song_artists    rsa ON rsa.song_id = rs.id
    JOIN   rockit.artist          ra  ON ra.id = rsa.artist_id
    JOIN   core.image             ci  ON ci.id = ra.image_id"""

    def get_stats_album_info_cte_fragment(self) -> str | None:
        return """    SELECT cm.id              AS media_id,
           cm.public_id        AS album_public_id,
           ra.name             AS album_name,
           ci.url              AS album_image_url
    FROM   rockit.song     rs
    JOIN   rockit.album    ra    ON ra.id        = rs.album_id
    JOIN   core.media      cm    ON cm.id        = ra.id
    JOIN   core.image      ci    ON ci.id        = ra.image_id"""


provider = RockItProvider()
name = "RockIt"
