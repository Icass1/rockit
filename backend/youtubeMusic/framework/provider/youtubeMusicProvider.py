import re
from logging import Logger
from typing import List, Tuple, Pattern

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it

# Core framework.
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework.provider.types import AddFromUrlAResult
from backend.core.framework.downloader.baseDownload import BaseDownload

# Core responses.
from backend.core.responses.searchResponse import (
    BaseSearchResultsItem,
    ArtistSearchResultsItem,
)
from backend.core.responses.basePlaylistResponse import (
    BasePlaylistResponse,
    PlaylistResponseItem,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse

# Youtube Music utils.
from backend.youtubeMusic.utils.youtubeMusicApi import (
    YoutubeMusicApi,
    YoutubeMusicPlaylist,
)

# Youtube Music access.
from backend.youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess
from backend.youtubeMusic.access.db.ormModels.track import TrackRow

# Youtube Music framework.
from backend.youtubeMusic.framework.youtubeMusic import YoutubeMusic, youtube_music
from backend.youtubeMusic.framework.download.youtubeMusicDownload import (
    YoutubeMusicDownload,
)

logger: Logger = getLogger(__name__)


YOUTUBE_MUSIC_URL_PATTERNS: List[Tuple[Pattern[str], str]] = [
    (
        re.compile(r"https?://music\.youtube\.com/watch\?v=([a-zA-Z0-9_-]+)(?:&.*)?$"),
        "/youtube-music/track/{}",
    ),
    (
        re.compile(r"https?://music\.youtube\.com/track/([a-zA-Z0-9_-]+)"),
        "/youtube-music/track/{}",
    ),
    (
        re.compile(r"https?://music\.youtube\.com/album/([a-zA-Z0-9_-]+)"),
        "/youtube-music/album/{}",
    ),
    (
        re.compile(r"https?://music\.youtube\.com/artist/([a-zA-Z0-9_-]+)"),
        "/youtube-music/artist/{}",
    ),
    (
        re.compile(
            r"https?://music\.youtube\.com/playlist\?list=([a-zA-Z0-9_-]+)(?:&.*)?$"
        ),
        "/youtube-music/playlist/{}",
    ),
]


class YoutubeMusicProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        self._id = provider_id
        self._name = provider_name
        YoutubeMusic.provider = self
        YoutubeMusic.provider_name = provider_name

    async def search_async(self, query: str) -> AResult[List[BaseSearchResultsItem]]:
        """Search YouTube Music and return a list of search items."""

        a_result = await YoutubeMusicApi.search_track_async(query=query, max_results=10)
        if a_result.is_not_ok():
            logger.error(f"YouTube Music search error: {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        tracks = a_result.result()

        result: List[BaseSearchResultsItem] = [
            BaseSearchResultsItem(
                type="song",
                title=track.title,
                url=f"/youtube-music/track/{track.youtube_id}",
                providerUrl=f"https://music.youtube.com/watch?v={track.youtube_id}",
                imageUrl=track.thumbnail_url,
                artists=[
                    ArtistSearchResultsItem(
                        name=artist_name,
                        url="",
                    )
                    for artist_name in track.artists
                ],
                provider="YouTube Music",
            )
            for track in tracks
        ]

        return AResult(code=AResultCode.OK, message="OK", result=result)

    async def get_playlist_async(
        self, session: AsyncSession, user_id: int, public_id: str
    ) -> AResult[BasePlaylistResponse]:
        """Get a YouTube Music playlist by public_id."""

        a_result_playlist: AResult[YoutubeMusicPlaylist] = (
            await YoutubeMusicApi.get_playlist_info_async(playlist_id=public_id)
        )
        if a_result_playlist.is_not_ok():
            logger.error(
                f"Error getting YouTube Music playlist. {a_result_playlist.info()}"
            )
            return AResult(
                code=a_result_playlist.code(), message=a_result_playlist.message()
            )

        playlist: YoutubeMusicPlaylist = a_result_playlist.result()

        song_responses: List[PlaylistResponseItem[BaseSongWithAlbumResponse]] = []
        for track in playlist.tracks:
            artists_list: List[BaseArtistResponse] = [
                BaseArtistResponse(
                    provider="YouTube Music",
                    publicId="",
                    url="",
                    providerUrl="",
                    name=artist_name,
                    imageUrl="",
                )
                for artist_name in track.artists
            ]

            album_response = BaseAlbumWithoutSongsResponse(
                provider="YouTube Music",
                publicId="",
                url="",
                providerUrl="",
                name=track.album,
                artists=[],
                releaseDate="",
                imageUrl=track.thumbnail_url,
            )

            song_responses.append(
                PlaylistResponseItem(
                    item=BaseSongWithAlbumResponse(
                        provider="YouTube Music",
                        publicId=track.youtube_id,
                        providerUrl=f"https://music.youtube.com/watch?v={track.youtube_id}",
                        name=track.title,
                        artists=artists_list,
                        audioSrc=None,
                        downloaded=False,
                        imageUrl=track.thumbnail_url,
                        duration_ms=track.duration_ms,
                        discNumber=1,
                        trackNumber=1,
                        album=album_response,
                    ),
                    addedAt=None,
                )
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BasePlaylistResponse(
                type="playlist",
                description=playlist.description,
                provider="YouTube Music",
                publicId=public_id,
                url=f"/youtube-music/playlist/{public_id}",
                providerUrl=f"https://music.youtube.com/playlist?list={public_id}",
                name=playlist.title,
                medias=song_responses,
                contributors=[],
                imageUrl=playlist.thumbnail_url,
                owner="",
            ),
        )

    @time_it
    async def get_song_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BaseSongWithAlbumResponse]:
        """Get a YouTube Music track by public_id."""

        a_result: AResult[BaseSongWithAlbumResponse] = (
            await youtube_music.get_track_async(session=session, public_id=public_id)
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting YouTube Music track. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    async def get_album_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BaseAlbumWithSongsResponse]:
        """Get a YouTube Music album by public_id."""

        a_result: AResult[BaseAlbumWithSongsResponse] = (
            await youtube_music.get_album_async(session=session, public_id=public_id)
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting YouTube Music album. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    async def get_artist_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BaseArtistResponse]:
        """Get a YouTube Music artist by public_id."""

        a_result: AResult[BaseArtistResponse] = await youtube_music.get_artist_async(
            session=session, public_id=public_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting YouTube Music artist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

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

            else:
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

            else:
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

            else:
                return AResult[AddFromUrlAResult](
                    code=a_result_artist.code(),
                    message="OK",
                    result=a_result_artist.result(),
                )
        elif "youtube-music/playlist" in internal_path:
            a_result_playlist: AResult[BasePlaylistResponse] = (
                await self.get_playlist_async(
                    session=session, user_id=0, public_id=resource_id
                )
            )

            if a_result_playlist.is_not_ok():
                logger.error(
                    f"Error adding YouTube Music playlist from URL. {a_result_playlist.info()}"
                )
                return AResult(
                    code=a_result_playlist.code(), message=a_result_playlist.message()
                )

            else:
                return AResult[AddFromUrlAResult](
                    code=a_result_playlist.code(),
                    message="OK",
                    result=a_result_playlist.result(),
                )

        return AResult(
            code=AResultCode.BAD_REQUEST,
            message="Unsupported YouTube Music resource type",
        )

    async def start_download_async(
        self,
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> AResult[BaseDownload]:
        """Create a YoutubeMusicDownload for the given track public_id."""

        a_result: AResult[str] = (
            await YoutubeMusicAccess.get_track_youtube_id_from_public_id_async(
                session=session, public_id=public_id
            )
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error getting youtube_id for public_id {public_id}: {a_result.message()}"
            )
            return AResult(code=a_result.code(), message=a_result.message())

        youtube_id: str = a_result.result()

        a_result_track: AResult[TrackRow] = (
            await YoutubeMusicAccess.get_track_by_youtube_id_async(
                session=session, youtube_id=youtube_id
            )
        )
        if a_result_track.is_not_ok():
            logger.error(
                f"Error getting track row for youtube_id {youtube_id}: {a_result_track.message()}"
            )
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        track: TrackRow = a_result_track.result()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=YoutubeMusicDownload(
                public_id=public_id,
                download_id=download_id,
                download_group_id=download_group_id,
                user_id=user_id,
                track_id=track.id,
                youtube_id=youtube_id,
                download_url=track.download_url,
            ),
        )

    def match_url(self, url: str) -> str | None:
        """Check if the URL is a YouTube Music URL and return the internal path."""
        for pattern, path_template in YOUTUBE_MUSIC_URL_PATTERNS:
            match: re.Match[str] | None = pattern.match(url)
            if match:
                return path_template.format(match.group(1))
        return None


provider = YoutubeMusicProvider()
name = "YouTube Music"
