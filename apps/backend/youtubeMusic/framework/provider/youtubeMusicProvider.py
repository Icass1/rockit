import re
from logging import Logger
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.audio.silence import request_bounds
from core.framework.downloader.baseDownload import BaseDownload
from core.framework.models.localSong import LocalSong
from core.framework.models.urlPattern import UrlPattern
from core.framework.provider.baseMediaProvider import BaseMediaProvider
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
from core.responses.searchResponse import BaseSearchResultsItem
from core.utils.timeIt import time_it
from logger import getLogger
from result import Result, ResultCode
from youtubeMusic.access.artistCatalogAccess import ArtistCatalogAccess
from youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess
from youtubeMusic.framework.youtubeMusic import YoutubeMusic, youtube_music

logger: Logger = getLogger(__name__)


YOUTUBE_MUSIC_URL_PATTERNS: list[UrlPattern] = [
    UrlPattern(
        pattern=re.compile(r"https?://music\.youtube\.com/watch\?v=([a-zA-Z0-9_-]+)(?:&.*)?$"),
        path_template="/youtube-music/track/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://music\.youtube\.com/track/([a-zA-Z0-9_-]+)"),
        path_template="/youtube-music/track/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://music\.youtube\.com/album/([a-zA-Z0-9_-]+)"),
        path_template="/youtube-music/album/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://music\.youtube\.com/artist/([a-zA-Z0-9_-]+)"),
        path_template="/youtube-music/artist/{}",
    ),
    UrlPattern(
        pattern=re.compile(
            r"https?://music\.youtube\.com/playlist\?list=([a-zA-Z0-9_-]+)(?:&.*)?$"
        ),
        path_template="/youtube-music/playlist/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://music\.youtube\.com/browse/(MPREb_[a-zA-Z0-9_-]+)"),
        path_template="/youtube-music/album/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://music\.youtube\.com/browse/(RDCLAK[a-zA-Z0-9_-]+)"),
        path_template="/youtube-music/album/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://music\.youtube\.com/browse/VL([a-zA-Z0-9_-]+)"),
        path_template="/youtube-music/playlist/{}",
    ),
]


class YoutubeMusicProvider(BaseMediaProvider):
    async def find_local_songs_async(
        self, session: AsyncSession, titles: list[str]
    ) -> Result[list[LocalSong]]:
        """Resolve local recordings regardless of this provider's remote health."""
        return await YoutubeMusicAccess.find_local_songs_async(session=session, titles=titles)

    async def get_local_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseSongWithAlbumResponse]]:
        """This provider's song retrieval is database-only."""
        result = await self.get_songs_async(session=session, public_ids=public_ids)
        if result.is_not_ok():
            logger.error(f"Local song lookup failed. {result.info()}")
            return Result(code=result.code(), message=result.message())
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=[song for song in result.result() if song.downloaded],
        )

    async def get_audio_bounds_async(
        self, session: AsyncSession, media_id: int
    ) -> Result[AudioBoundsResponse]:
        """Resolve this provider's downloaded audio for optional analysis."""
        result = await YoutubeMusicAccess.get_audio_key_async(session=session, media_id=media_id)
        if result.is_not_ok():
            logger.error(f"Could not resolve audio source. {result.info()}")
            return Result(code=result.code(), message=result.message())
        bounds = await request_bounds(path=result.result())
        return Result(code=ResultCode.OK, message="OK", result=bounds)

    async def get_artist_catalog_async(
        self, session: AsyncSession, name: str, public_id: str | None = None
    ) -> Result[ArtistCatalogResponse]:
        """Expose this provider's indexed artist catalog to Core."""
        return await ArtistCatalogAccess.get_async(session=session, name=name, public_id=public_id)

    def download_concurrency_limit(self) -> int:
        return 1

    def download_cooldown_remaining(self) -> float:
        from youtube.framework.youtubeGate import youtube_gate

        return youtube_gate.cooldown_remaining()

    async def check_health_async(self) -> ResultCode:
        """Check the downloader used by this provider even if its source is disabled."""
        from youtube.framework.potProvider import PotProvider

        health = await PotProvider.check_health_async(max_age_seconds=30.0)
        return ResultCode(code=health.code(), message=health.message())

    def can_manage_downloads(self) -> bool:
        return True

    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        self._id = provider_id
        self._name = provider_name
        YoutubeMusic.provider = self
        YoutubeMusic.provider_name = provider_name

    async def search_page_async(
        self,
        session: AsyncSession,
        query: str,
        limit: int = 15,
        media_type: str | None = None,
    ) -> Result[list[BaseSearchResultsItem]]:
        return await youtube_music.search_media_async(
            session=session, query=query, limit=limit, media_type=media_type
        )

    def search_supports_category(self) -> bool:
        return True

    def search_page_size(self) -> int:
        return 100

    @time_it
    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> Result[list[BaseSearchResultsItem]]:
        """Search YouTube Music and return songs, artists, albums and playlists."""

        return await youtube_music.search_media_async(session=session, query=query)

    @time_it
    async def get_playlists_with_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> Result[list[BasePlaylistWithMediasResponse]]:
        """Get YouTube Music playlists (with medias) by public_ids."""

        return await youtube_music.get_playlists_with_medias_async(
            session=session, user_id=user_id, public_ids=public_ids
        )

    @time_it
    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> Result[list[BasePlaylistWithoutMediasResponse]]:
        """Get YouTube Music playlists (without medias) by public_ids."""

        return await youtube_music.get_playlists_without_medias_async(
            session=session, user_id=user_id, public_ids=public_ids
        )

    @time_it
    async def get_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseSongWithAlbumResponse]]:
        """Get YouTube Music tracks by public_ids."""

        return await youtube_music.get_tracks_batch_async(session=session, public_ids=public_ids)

    @time_it
    async def get_albums_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseAlbumWithSongsResponse]]:
        """Get YouTube Music albums by public_ids."""

        return await youtube_music.get_albums_batch_async(session=session, public_ids=public_ids)

    @time_it
    async def get_artists_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseArtistResponse]]:
        """Get YouTube Music artists by public_ids."""

        return await youtube_music.get_artists_async(session=session, public_ids=public_ids)

    @time_it
    async def add_from_url_async(self, session: AsyncSession, url: str) -> Result[AddFromUrlResult]:
        """Add a YouTube Music track/album/artist/playlist from URL to the database."""

        internal_path: str | None = self.match_url(url)
        if not internal_path:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Invalid YouTube Music URL",
            )

        parts = internal_path.strip("/").split("/")
        if len(parts) < 2:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Invalid YouTube Music URL path",
            )

        resource_id = parts[2]

        if "youtube-music/track" in internal_path:
            a_result_song: Result[BaseSongWithAlbumResponse] = await YoutubeMusic.add_track_async(
                session=session, youtube_id=resource_id
            )
            if a_result_song.is_not_ok():
                logger.error(f"Error adding YouTube Music track from URL. {a_result_song.info()}")
                return Result(code=a_result_song.code(), message=a_result_song.message())

            return Result[AddFromUrlResult](
                code=a_result_song.code(),
                message="OK",
                result=a_result_song.result(),
            )

        elif "youtube-music/album" in internal_path:
            a_result_album: Result[BaseAlbumWithSongsResponse] = await YoutubeMusic.add_album_async(
                session=session, youtube_id=resource_id
            )
            if a_result_album.is_not_ok():
                logger.error(f"Error adding YouTube Music album from URL. {a_result_album.info()}")
                return Result(code=a_result_album.code(), message=a_result_album.message())

            return Result[AddFromUrlResult](
                code=a_result_album.code(),
                message="OK",
                result=a_result_album.result(),
            )

        elif "youtube-music/artist" in internal_path:
            a_result_artist: Result[BaseArtistResponse] = await YoutubeMusic.add_artist_async(
                session=session, youtube_id=resource_id
            )
            if a_result_artist.is_not_ok():
                logger.error(
                    f"Error adding YouTube Music artist from URL. {a_result_artist.info()}"
                )
                return Result(code=a_result_artist.code(), message=a_result_artist.message())

            return Result[AddFromUrlResult](
                code=a_result_artist.code(),
                message="OK",
                result=a_result_artist.result(),
            )

        elif "youtube-music/playlist" in internal_path:
            a_result_playlist: Result[
                BasePlaylistWithMediasResponse
            ] = await YoutubeMusic.add_playlist_async(session=session, youtube_id=resource_id)
            if a_result_playlist.is_not_ok():
                logger.error(
                    f"Error adding YouTube Music playlist from URL. {a_result_playlist.info()}"
                )
                return Result(
                    code=a_result_playlist.code(),
                    message=a_result_playlist.message(),
                )

            return Result[AddFromUrlResult](
                code=a_result_playlist.code(),
                message="OK",
                result=a_result_playlist.result(),
            )

        return Result(
            code=ResultCode.BAD_REQUEST,
            message="Unsupported YouTube Music resource type",
        )

    @time_it
    async def start_download_async(
        self,
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> Result[BaseDownload]:
        """Create a YoutubeMusicDownload for the given track public_id."""

        return await youtube_music.start_download_async(
            session=session,
            public_id=public_id,
            download_id=download_id,
            download_group_id=download_group_id,
            user_id=user_id,
        )

    def match_url(self, url: str) -> str | None:
        """Check if the URL is a YouTube Music URL and return the internal path."""

        for up in YOUTUBE_MUSIC_URL_PATTERNS:
            match: re.Match[str] | None = up.pattern.match(url)
            if match:
                return up.path_template.format(match.group(1))
        return None

    def get_stats_media_info_cte_fragment(self) -> str | None:
        from core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT t.id          AS media_id,
           t.duration_ms AS duration_ms,
           cm.public_id  AS public_id,
           t.title       AS media_name,
           ci.id AS image_id,
           {MediaTypeEnum.SONG.value} AS media_type_key
    FROM   youtube_music.track t
    JOIN   core.media          cm ON cm.id = t.id
    JOIN   core.image          ci ON ci.id = t.image_id"""

    def get_stats_artist_info_cte_fragment(self) -> str | None:
        return """    SELECT t.id               AS media_id,
           cm_a.public_id     AS artist_public_id,
           a.name             AS artist_name,
           ai.id AS artist_image_id
    FROM   youtube_music.track         t
    JOIN   youtube_music.track_artists ta   ON ta.track_id  = t.id
    JOIN   youtube_music.artist        a    ON a.id         = ta.artist_id
    JOIN   core.media                  cm_a ON cm_a.id      = a.id
    JOIN   core.image                  ai   ON ai.id        = a.image_id"""

    def get_stats_album_info_cte_fragment(self) -> str | None:
        return """    SELECT t.id              AS media_id,
           cm_al.public_id   AS album_public_id,
           al.title          AS album_name,
           ai.id             AS album_image_id,
           (SELECT string_agg(DISTINCT artist.name, ', ' ORDER BY artist.name)
            FROM youtube_music.album_artists aa
            JOIN youtube_music.artist artist ON artist.id = aa.artist_id
            WHERE aa.album_id = al.id) AS album_artists
    FROM   youtube_music.track  t
    JOIN   youtube_music.album  al    ON al.id    = t.album_id
    JOIN   core.media           cm_al ON cm_al.id = al.id
    JOIN   core.image           ai    ON ai.id    = al.image_id"""

    def get_collection_provider_url(self, metadata: dict[str, Any], media_type_key: int) -> str:
        """Build a source link without loading collection contents."""
        external_id = metadata.get("external_id") or metadata.get("youtube_id")
        if not external_id:
            return ""
        return (
            f"https://music.youtube.com/browse/{external_id}"
            if media_type_key == 2
            else f"https://www.youtube.com/playlist?list={external_id}"
        )

    def get_search_index_cte_fragment(self) -> str | None:
        from core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT cm.id                       AS internal_id,
           cm.public_id                 AS public_id,
           t.title                      AS name,
           CONCAT_WS(', ',
               NULLIF(string_agg(DISTINCT ar.name, ', '), ''),
               NULLIF(al.title, '')
           )                            AS subtitle,
           {MediaTypeEnum.SONG.value}   AS media_type_key,
           p.name                       AS provider_name,
           ci.id AS image_id
    FROM   youtube_music.track t
    JOIN   core.media    cm ON cm.id = t.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = t.image_id
    LEFT JOIN youtube_music.album        al  ON al.id = t.album_id
    LEFT JOIN youtube_music.track_artists ta ON ta.track_id = t.id
    LEFT JOIN youtube_music.artist       ar  ON ar.id = ta.artist_id
    GROUP BY cm.id, cm.public_id, t.title, al.title, p.name, ci.id
    UNION ALL
    SELECT cm.id                       AS internal_id,
           cm.public_id                 AS public_id,
           al.title                     AS name,
           NULLIF(string_agg(DISTINCT ar.name, ', '), '') AS subtitle,
           {MediaTypeEnum.ALBUM.value}  AS media_type_key,
           p.name                       AS provider_name,
           ci.id AS image_id
    FROM   youtube_music.album al
    JOIN   core.media    cm ON cm.id = al.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = al.image_id
    LEFT JOIN youtube_music.album_artists aa ON aa.album_id = al.id
    LEFT JOIN youtube_music.artist       ar  ON ar.id = aa.artist_id
    GROUP BY cm.id, cm.public_id, al.title, p.name, ci.id
    UNION ALL
    SELECT cm.id                        AS internal_id,
           cm.public_id                  AS public_id,
           a.name                        AS name,
           NULL                           AS subtitle,
           {MediaTypeEnum.ARTIST.value}  AS media_type_key,
           p.name                        AS provider_name,
           ci.id AS image_id
    FROM   youtube_music.artist a
    JOIN   core.media    cm ON cm.id = a.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = a.image_id"""

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> Result[int]:
        """Get the duration of a YouTube Music track in milliseconds."""

        return await youtube_music.get_media_duration_ms_async(session=session, public_id=public_id)

    async def delete_media_async(self, session: AsyncSession, public_id: str) -> ResultCode:
        """Remove the media file for a YouTube Music track and reset its path in the database."""

        return await youtube_music.delete_media_async(session=session, public_id=public_id)


provider = YoutubeMusicProvider()
name = "YouTube Music"
