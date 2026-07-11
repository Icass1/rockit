import re
from logging import Logger
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it

# Core framework.
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.provider.types import AddFromUrlAResult
from backend.core.framework.models.urlPattern import UrlPattern
from backend.core.framework.downloader.baseDownload import BaseDownload

# Core responses.
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)

# Youtube Music framework.
from backend.youtubeMusic.framework.youtubeMusic import YoutubeMusic, youtube_music

logger: Logger = getLogger(__name__)


YOUTUBE_MUSIC_URL_PATTERNS: List[UrlPattern] = [
    UrlPattern(
        pattern=re.compile(
            r"https?://music\.youtube\.com/watch\?v=([a-zA-Z0-9_-]+)(?:&.*)?$"
        ),
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
        pattern=re.compile(
            r"https?://music\.youtube\.com/browse/(MPREb_[a-zA-Z0-9_-]+)"
        ),
        path_template="/youtube-music/album/{}",
    ),
    UrlPattern(
        pattern=re.compile(
            r"https?://music\.youtube\.com/browse/(RDCLAK[a-zA-Z0-9_-]+)"
        ),
        path_template="/youtube-music/album/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://music\.youtube\.com/browse/VL([a-zA-Z0-9_-]+)"),
        path_template="/youtube-music/playlist/{}",
    ),
]


class YoutubeMusicProvider(BaseMediaProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        self._id = provider_id
        self._name = provider_name
        YoutubeMusic.provider = self
        YoutubeMusic.provider_name = provider_name

    @time_it
    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> AResult[List[BaseSearchResultsItem]]:
        """Search YouTube Music and return songs, artists, albums and playlists."""

        return await youtube_music.search_media_async(session=session, query=query)

    @time_it
    async def get_playlists_with_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithMediasResponse]]:
        """Get YouTube Music playlists (with medias) by public_ids."""

        return await youtube_music.get_playlists_with_medias_async(
            session=session, user_id=user_id, public_ids=public_ids
        )

    @time_it
    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithoutMediasResponse]]:
        """Get YouTube Music playlists (without medias) by public_ids."""

        return await youtube_music.get_playlists_without_medias_async(
            session=session, user_id=user_id, public_ids=public_ids
        )

    @time_it
    async def get_songs_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseSongWithAlbumResponse]]:
        """Get YouTube Music tracks by public_ids."""

        return await youtube_music.get_tracks_batch_async(
            session=session, public_ids=public_ids
        )

    @time_it
    async def get_albums_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseAlbumWithSongsResponse]]:
        """Get YouTube Music albums by public_ids."""

        return await youtube_music.get_albums_batch_async(
            session=session, public_ids=public_ids
        )

    @time_it
    async def get_artists_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseArtistResponse]]:
        """Get YouTube Music artists by public_ids."""

        return await youtube_music.get_artists_async(
            session=session, public_ids=public_ids
        )

    @time_it
    async def add_from_url_async(
        self, session: AsyncSession, url: str
    ) -> AResult[AddFromUrlAResult]:
        """Add a YouTube Music track/album/artist/playlist from URL to the database."""

        internal_path: str | None = self.match_url(url)
        if not internal_path:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Invalid YouTube Music URL",
            )

        parts = internal_path.strip("/").split("/")
        if len(parts) < 2:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Invalid YouTube Music URL path",
            )

        resource_id = parts[2]

        if "youtube-music/track" in internal_path:
            a_result_song: AResult[BaseSongWithAlbumResponse] = (
                await YoutubeMusic.add_track_async(
                    session=session, youtube_id=resource_id
                )
            )
            if a_result_song.is_not_ok():
                logger.error(
                    f"Error adding YouTube Music track from URL. {a_result_song.info()}"
                )
                return AResult(
                    code=a_result_song.code(), message=a_result_song.message()
                )

            return AResult[AddFromUrlAResult](
                code=a_result_song.code(),
                message="OK",
                result=a_result_song.result(),
            )

        elif "youtube-music/album" in internal_path:
            a_result_album: AResult[BaseAlbumWithSongsResponse] = (
                await YoutubeMusic.add_album_async(
                    session=session, youtube_id=resource_id
                )
            )
            if a_result_album.is_not_ok():
                logger.error(
                    f"Error adding YouTube Music album from URL. {a_result_album.info()}"
                )
                return AResult(
                    code=a_result_album.code(), message=a_result_album.message()
                )

            return AResult[AddFromUrlAResult](
                code=a_result_album.code(),
                message="OK",
                result=a_result_album.result(),
            )

        elif "youtube-music/artist" in internal_path:
            a_result_artist: AResult[BaseArtistResponse] = (
                await YoutubeMusic.add_artist_async(
                    session=session, youtube_id=resource_id
                )
            )
            if a_result_artist.is_not_ok():
                logger.error(
                    f"Error adding YouTube Music artist from URL. {a_result_artist.info()}"
                )
                return AResult(
                    code=a_result_artist.code(), message=a_result_artist.message()
                )

            return AResult[AddFromUrlAResult](
                code=a_result_artist.code(),
                message="OK",
                result=a_result_artist.result(),
            )

        elif "youtube-music/playlist" in internal_path:
            a_result_playlist: AResult[BasePlaylistWithMediasResponse] = (
                await YoutubeMusic.add_playlist_async(
                    session=session, youtube_id=resource_id
                )
            )
            if a_result_playlist.is_not_ok():
                logger.error(
                    f"Error adding YouTube Music playlist from URL. {a_result_playlist.info()}"
                )
                return AResult(
                    code=a_result_playlist.code(),
                    message=a_result_playlist.message(),
                )

            return AResult[AddFromUrlAResult](
                code=a_result_playlist.code(),
                message="OK",
                result=a_result_playlist.result(),
            )

        return AResult(
            code=AResultCode.BAD_REQUEST,
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
    ) -> AResult[BaseDownload]:
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
        from backend.core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT t.id          AS media_id,
           t.duration_ms AS duration_ms,
           cm.public_id  AS public_id,
           t.title       AS media_name,
           ci.url        AS image_url,
           {MediaTypeEnum.SONG.value} AS media_type_key
    FROM   youtube_music.track t
    JOIN   core.media          cm ON cm.id = t.id
    JOIN   core.image          ci ON ci.id = t.image_id"""

    def get_stats_artist_info_cte_fragment(self) -> str | None:
        return """    SELECT t.id               AS media_id,
           cm_a.public_id     AS artist_public_id,
           a.name             AS artist_name,
           ai.url             AS artist_image_url
    FROM   youtube_music.track         t
    JOIN   youtube_music.track_artists ta   ON ta.track_id  = t.id
    JOIN   youtube_music.artist        a    ON a.id         = ta.artist_id
    JOIN   core.media                  cm_a ON cm_a.id      = a.id
    JOIN   core.image                  ai   ON ai.id        = a.image_id"""

    def get_stats_album_info_cte_fragment(self) -> str | None:
        return """    SELECT t.id              AS media_id,
           cm_al.public_id   AS album_public_id,
           al.title          AS album_name,
           ai.url            AS album_image_url
    FROM   youtube_music.track  t
    JOIN   youtube_music.album  al    ON al.id    = t.album_id
    JOIN   core.media           cm_al ON cm_al.id = al.id
    JOIN   core.image           ai    ON ai.id    = al.image_id"""

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        """Get the duration of a YouTube Music track in milliseconds."""

        return await youtube_music.get_media_duration_ms_async(
            session=session, public_id=public_id
        )

    async def delete_media_async(
        self, session: AsyncSession, public_id: str
    ) -> AResultCode:
        """Remove the media file for a YouTube Music track and reset its path in the database."""

        return await youtube_music.delete_media_async(
            session=session, public_id=public_id
        )


provider = YoutubeMusicProvider()
name = "YouTube Music"
