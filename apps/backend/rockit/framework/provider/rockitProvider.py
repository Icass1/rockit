from backend.core.framework.models.localSong import LocalSong
from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from core.aResult import AResult, AResultCode
from core.framework.downloader.baseDownload import BaseDownload
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.framework.provider.baseUploadProvider import BaseUploadProvider
from core.framework.provider.types import AddFromUrlAResult
from core.requests.uploadAlbumRequest import UploadAlbumRequest
from core.requests.uploadSongRequest import UploadSongRequest
from core.requests.uploadVideoRequest import UploadVideoRequest
from core.responses.artistPageResponse import ArtistCatalogResponse
from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.responses.searchResponse import BaseSearchResultsItem
from core.responses.uploadResponse import UploadResponse
from logger import getLogger
from rockit.access.artistCatalogAccess import ArtistCatalogAccess
from rockit.access.db.ormModels.video import RockitVideoRow
from rockit.access.rockitAccess import RockitAccess
from rockit.framework.rockit import Rockit

from core.framework.audio.silence import request_bounds
from core.responses.audioBoundsResponse import AudioBoundsResponse

logger: Logger = getLogger(__name__)


class RockItProvider(BaseMediaProvider, BaseUploadProvider):
    async def find_local_songs_async(
        self, session: AsyncSession, titles: list[str]
    ) -> AResult[list[LocalSong]]:
        """Resolve local recordings regardless of this provider's remote health."""
        return await RockitAccess.find_local_songs_async(session=session, titles=titles)

    async def get_local_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> AResult[List[BaseSongWithAlbumResponse]]:
        """This provider's song retrieval is database-only."""
        result = await self.get_songs_async(session=session, public_ids=public_ids)
        if result.is_not_ok():
            logger.error(f"Local song lookup failed. {result.info()}")
            return AResult(code=result.code(), message=result.message())
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[song for song in result.result() if song.downloaded],
        )

    async def get_audio_bounds_async(
        self, session: AsyncSession, media_id: int
    ) -> AResult[AudioBoundsResponse]:
        """Resolve this source's local song without exposing paths to clients."""
        result = await RockitAccess.get_songs_async(
            session=session, song_ids=[media_id]
        )
        if result.is_not_ok():
            logger.error(f"Could not resolve audio source. {result.info()}")
            return AResult(code=result.code(), message=result.message())
        songs = result.result()
        bounds = await request_bounds(path=songs[0].file_path if songs else None)
        return AResult(code=AResultCode.OK, message="OK", result=bounds)

    async def get_artist_catalog_async(
        self, session: AsyncSession, name: str, public_id: str | None = None
    ) -> AResult[ArtistCatalogResponse]:
        """Expose this provider's indexed artist catalog to Core."""
        return await ArtistCatalogAccess.get_async(session=session, name=name, public_id=public_id)

    def download_concurrency_limit(self) -> int:
        return 3

    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        Rockit.provider_name = provider_name
        Rockit.provider_id = provider_id

        self._id = provider_id
        self._name = provider_name

    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> AResult[list[BaseSearchResultsItem]]:
        """Search RockIt uploaded media by name."""

        return await Rockit.search_async(session=session, query=query)

    async def get_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> AResult[list[BaseSongWithAlbumResponse]]:
        """Get RockIt songs by public IDs."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        return await Rockit.get_songs_responses_async(session=session, public_ids=public_ids)

    async def get_albums_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> AResult[list[BaseAlbumWithSongsResponse]]:
        """Get RockIt albums by public IDs."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        return await Rockit.get_albums_responses_async(session=session, public_ids=public_ids)

    async def get_artists_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> AResult[list[BaseArtistResponse]]:
        """Get RockIt artists. RockIt stores artist name as a string on songs/albums.

        Returns a simple artist response for each public_id.
        """

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="RockIt provider does not support standalone artist queries.",
        )

    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> AResult[list[BasePlaylistWithoutMediasResponse]]:
        """RockIt does not support playlists."""

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="RockIt provider does not support playlists.",
        )

    async def get_playlists_with_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> AResult[list[BasePlaylistWithMediasResponse]]:
        """RockIt does not support playlists."""

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="RockIt provider does not support playlists.",
        )

    async def get_videos_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> AResult[list[BaseVideoResponse]]:
        """Get RockIt videos by public IDs."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        return await Rockit.get_videos_responses_async(session=session, public_ids=public_ids)

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

        return await Rockit.get_media_duration_ms_async(session=session, public_id=public_id)

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

    async def get_frame_async(
        self,
        session: AsyncSession,
        public_id: str,
        timestamp_ms: float,
    ) -> AResult[bytes]:
        """Extract a single frame from a RockIt video at the given timestamp (ms)."""

        a_result_videos: AResult[
            list[RockitVideoRow]
        ] = await RockitAccess.get_videos_from_public_ids_async(
            session=session, public_ids=[public_id]
        )
        if a_result_videos.is_not_ok() or not a_result_videos.result():
            logger.error(f"Error getting video for public id {public_id}. {a_result_videos.info()}")
            return AResult(
                code=(
                    a_result_videos.code() if a_result_videos.is_not_ok() else AResultCode.NOT_FOUND
                ),
                message=(
                    a_result_videos.message() if a_result_videos.is_not_ok() else "Video not found"
                ),
            )

        video: RockitVideoRow = a_result_videos.result()[0]

        if not video.file_path:
            logger.error(f"Video {public_id} has no file path.")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Video has no file path",
            )

        return await Rockit.get_frame_async(
            file_path=video.file_path,
            public_id=public_id,
            timestamp_ms=timestamp_ms,
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
        from core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT cm.id                                          AS media_id,
           COALESCE(rs.duration_ms, 0)                    AS duration_ms,
           cm.public_id                                   AS public_id,
           rs.name                                        AS media_name,
           ci.url                                         AS image_url,
           {MediaTypeEnum.SONG.value}                     AS media_type_key
    FROM   rockit.song rs
    JOIN   core.media cm ON cm.id = rs.id
    JOIN   core.image ci ON ci.id = rs.image_id
    UNION ALL
    SELECT cm.id                                          AS media_id,
           COALESCE(rv.duration_ms, 0)                    AS duration_ms,
           cm.public_id                                   AS public_id,
           rv.name                                        AS media_name,
           ci.url                                         AS image_url,
           {MediaTypeEnum.VIDEO.value}                    AS media_type_key
    FROM   rockit.video rv
    JOIN   core.media cm ON cm.id = rv.id
    JOIN   core.image ci ON ci.id = rv.image_id"""

    def get_stats_artist_info_cte_fragment(self) -> str | None:
        return """    SELECT rs.id           AS media_id,
           cm.public_id     AS artist_public_id,
           ra.name          AS artist_name,
           ci.url           AS artist_image_url
    FROM   rockit.song            rs
    JOIN   core.media             cm  ON cm.id = rs.id
    JOIN   rockit.song_artists    rsa ON rsa.song_id = rs.id
    JOIN   rockit.artist          ra  ON ra.id = rsa.artist_id
    JOIN   core.image             ci  ON ci.id = ra.image_id
    UNION ALL
    SELECT rv.id          AS media_id,
           cm.public_id   AS artist_public_id,
           ra.name        AS artist_name,
           ci.url         AS artist_image_url
    FROM   rockit.video            rv
    JOIN   core.media              cm  ON cm.id = rv.id
    JOIN   rockit.video_artists    rva ON rva.video_id = rv.id
    JOIN   rockit.artist           ra  ON ra.id = rva.artist_id
    JOIN   core.image              ci  ON ci.id = ra.image_id"""

    def get_stats_album_info_cte_fragment(self) -> str | None:
        return """    SELECT rs.id              AS media_id,
           cm.public_id        AS album_public_id,
           ra.name             AS album_name,
           ci.url              AS album_image_url,
           (SELECT string_agg(DISTINCT artist.name, ', ' ORDER BY artist.name)
            FROM rockit.album_artists aa
            JOIN rockit.artist artist ON artist.id = aa.artist_id
            WHERE aa.album_id = ra.id) AS album_artists
    FROM   rockit.song     rs
    JOIN   rockit.album    ra    ON ra.id        = rs.album_id
    JOIN   core.media      cm    ON cm.id        = ra.id
    JOIN   core.image      ci    ON ci.id        = ra.image_id"""

    def get_search_index_cte_fragment(self) -> str | None:
        from core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT cm.id                          AS internal_id,
           cm.public_id                    AS public_id,
           rs.name                         AS name,
           CONCAT_WS(', ',
               NULLIF(string_agg(DISTINCT rart.name, ', '), ''),
               NULLIF(string_agg(DISTINCT album_artist.name, ', '), ''),
               NULLIF(ra.name, '')
           )                               AS subtitle,
           {MediaTypeEnum.SONG.value}      AS media_type_key,
           p.name                          AS provider_name,
           ci.url                          AS image_url
    FROM   rockit.song rs
    JOIN   core.media    cm ON cm.id = rs.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = rs.image_id
    LEFT JOIN rockit.album       ra   ON ra.id = rs.album_id
    LEFT JOIN rockit.album_artists album_credit ON album_credit.album_id = rs.album_id
    LEFT JOIN rockit.artist album_artist ON album_artist.id = album_credit.artist_id
    LEFT JOIN rockit.song_artists rsa ON rsa.song_id = rs.id
    LEFT JOIN rockit.artist      rart ON rart.id = rsa.artist_id
    GROUP BY cm.id, cm.public_id, rs.name, ra.name, p.name, ci.url
    UNION ALL
    SELECT cm.id                          AS internal_id,
           cm.public_id                    AS public_id,
           rv.name                         AS name,
           NULLIF(string_agg(DISTINCT rart.name, ', '), '') AS subtitle,
           {MediaTypeEnum.VIDEO.value}     AS media_type_key,
           p.name                          AS provider_name,
           ci.url                          AS image_url
    FROM   rockit.video rv
    JOIN   core.media    cm ON cm.id = rv.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = rv.image_id
    LEFT JOIN rockit.video_artists rva   ON rva.video_id = rv.id
    LEFT JOIN rockit.artist       rart   ON rart.id = rva.artist_id
    GROUP BY cm.id, cm.public_id, rv.name, p.name, ci.url
    UNION ALL
    SELECT cm.id                          AS internal_id,
           cm.public_id                    AS public_id,
           ra.name                         AS name,
           NULLIF(string_agg(DISTINCT rart.name, ', '), '') AS subtitle,
           {MediaTypeEnum.ALBUM.value}     AS media_type_key,
           p.name                          AS provider_name,
           ci.url                          AS image_url
    FROM   rockit.album ra
    JOIN   core.media    cm ON cm.id = ra.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = ra.image_id
    LEFT JOIN rockit.album_artists raa   ON raa.album_id = ra.id
    LEFT JOIN rockit.artist      rart   ON rart.id = raa.artist_id
    GROUP BY cm.id, cm.public_id, ra.name, p.name, ci.url
    UNION ALL
    SELECT rart.id                         AS internal_id,
           NULL::text                      AS public_id,
           rart.name                       AS name,
           NULL                            AS subtitle,
           {MediaTypeEnum.ARTIST.value}    AS media_type_key,
           'RockIt'                        AS provider_name,
           ci.url                          AS image_url
    FROM   rockit.artist rart
    JOIN   core.image    ci ON ci.id = rart.image_id"""


provider = RockItProvider()
name = "RockIt"
