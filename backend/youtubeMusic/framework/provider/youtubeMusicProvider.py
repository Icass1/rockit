import re
from datetime import datetime, timezone
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
from backend.core.responses.searchResponse import (
    BaseSearchResultsItem,
    ArtistSearchResultsItem,
)
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
    PlaylistResponseItem,
)
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)

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

        import asyncio

        (
            a_tracks,
            a_artists,
            a_albums,
            a_playlists,
        ) = await asyncio.gather(
            YoutubeMusicApi.search_track_async(query=query, max_results=5),
            YoutubeMusicApi.search_artists_async(query=query, max_results=5),
            YoutubeMusicApi.search_albums_async(query=query, max_results=5),
            YoutubeMusicApi.search_playlists_async(query=query, max_results=5),
        )

        result: List[BaseSearchResultsItem] = []

        if a_tracks.is_ok():
            tracks = a_tracks.result()
            downloaded_a: AResult[set[str]] = (
                await YoutubeMusicAccess.get_downloaded_youtube_ids_async(
                    session=session,
                    youtube_ids=[t.youtube_id for t in tracks],
                )
            )
            if downloaded_a.is_not_ok():
                logger.error(
                    f"Error getting downloaded YouTube IDs. {downloaded_a.info()}"
                )
                downloaded_ids: set[str] = set()
            else:
                downloaded_ids: set[str] = downloaded_a.result()
            for track in tracks:
                result.append(
                    BaseSearchResultsItem(
                        type="song",
                        name=track.title,
                        providerUrl=f"https://music.youtube.com/watch?v={track.youtube_id}",
                        imageUrl=track.thumbnail_url,
                        artists=[
                            ArtistSearchResultsItem(name=name, url="")
                            for name in track.artists
                        ],
                        provider=YoutubeMusic.provider_name,
                        downloaded=track.youtube_id in downloaded_ids,
                        url=None,
                    )
                )

        else:
            logger.error(f"YouTube Music track search error: {a_tracks.info()}")

        if a_artists.is_ok():
            artists_result = a_artists.result()
            artist_a: AResult[dict[str, str]] = (
                await YoutubeMusicAccess.get_artist_public_ids_by_youtube_ids_async(
                    session=session,
                    youtube_ids=[a.youtube_id for a in artists_result],
                )
            )
            if artist_a.is_not_ok():
                logger.error(f"Error getting artist public IDs. {artist_a.info()}")
                artist_public_ids: dict[str, str] = {}
            else:
                artist_public_ids: dict[str, str] = artist_a.result()
            for artist in artists_result:
                result.append(
                    BaseSearchResultsItem(
                        type="artist",
                        name=artist.name,
                        providerUrl=f"https://music.youtube.com/channel/{artist.youtube_id}",
                        imageUrl=artist.thumbnail_url,
                        artists=[],
                        provider=YoutubeMusic.provider_name,
                        downloaded=None,
                        url=(
                            f"/artist/{artist_public_ids[artist.youtube_id]}"
                            if artist.youtube_id in artist_public_ids
                            else None
                        ),
                    )
                )
        else:
            logger.error(f"YouTube Music artist search error: {a_artists.info()}")

        if a_albums.is_ok():
            albums_result = a_albums.result()
            album_a: AResult[dict[str, str]] = (
                await YoutubeMusicAccess.get_album_public_ids_by_youtube_ids_async(
                    session=session,
                    youtube_ids=[al.youtube_id for al in albums_result],
                )
            )
            if album_a.is_not_ok():
                logger.error(f"Error getting album public IDs. {album_a.info()}")
                album_public_ids: dict[str, str] = {}
            else:
                album_public_ids: dict[str, str] = album_a.result()
            for album in albums_result:
                result.append(
                    BaseSearchResultsItem(
                        type="album",
                        name=album.title,
                        providerUrl=f"https://music.youtube.com/browse/{album.youtube_id}",
                        imageUrl=album.thumbnail_url,
                        artists=[
                            ArtistSearchResultsItem(name=name, url="")
                            for name in album.artists
                        ],
                        provider=YoutubeMusic.provider_name,
                        downloaded=None,
                        url=(
                            f"/album/{album_public_ids[album.youtube_id]}"
                            if album.youtube_id in album_public_ids
                            else None
                        ),
                    )
                )
        else:
            logger.error(f"YouTube Music album search error: {a_albums.info()}")

        if a_playlists.is_ok():
            playlists_result = a_playlists.result()
            playlist_a: AResult[dict[str, str]] = (
                await YoutubeMusicAccess.get_playlist_public_ids_by_youtube_ids_async(
                    session=session,
                    youtube_ids=[p.youtube_id for p in playlists_result],
                )
            )
            if playlist_a.is_not_ok():
                logger.error(f"Error getting playlist public IDs. {playlist_a.info()}")
                playlist_public_ids: dict[str, str] = {}
            else:
                playlist_public_ids: dict[str, str] = playlist_a.result()
            for playlist in playlists_result:
                result.append(
                    BaseSearchResultsItem(
                        type="playlist",
                        name=playlist.title,
                        providerUrl=f"https://music.youtube.com/browse/{playlist.youtube_id}",
                        imageUrl=playlist.thumbnail_url,
                        artists=(
                            [ArtistSearchResultsItem(name=playlist.author, url="")]
                            if playlist.author
                            else []
                        ),
                        provider=YoutubeMusic.provider_name,
                        downloaded=None,
                        url=(
                            f"/playlist/{playlist_public_ids[playlist.youtube_id]}"
                            if playlist.youtube_id in playlist_public_ids
                            else None
                        ),
                    )
                )
        else:
            logger.error(f"YouTube Music playlist search error: {a_playlists.info()}")

        if not result:
            return AResult(code=AResultCode.NOT_FOUND, message="No results found")

        return AResult(code=AResultCode.OK, message="OK", result=result)

    @time_it
    async def get_playlists_with_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithMediasResponse]]:
        """Get YouTube Music playlists by public_ids."""

        results: List[BasePlaylistWithMediasResponse] = []
        for public_id in public_ids:
            a_result_playlist: AResult[YoutubeMusicPlaylist] = (
                await YoutubeMusicApi.get_playlist_info_async(playlist_id=public_id)
            )
            if a_result_playlist.is_not_ok():
                logger.error(
                    f"Error getting YouTube Music playlist. {a_result_playlist.info()}"
                )
                continue

            playlist: YoutubeMusicPlaylist = a_result_playlist.result()

            song_responses: List[PlaylistResponseItem[BaseSongWithAlbumResponse]] = []
            for track in playlist.tracks:
                artists_list: List[BaseArtistResponse] = [
                    BaseArtistResponse(
                        provider=YoutubeMusic.provider_name,
                        publicId="",
                        url="",
                        providerUrl="",
                        name=artist_name,
                        imageUrl="",
                    )
                    for artist_name in track.artists
                ]

                album_response = BaseAlbumWithoutSongsResponse(
                    provider=YoutubeMusic.provider_name,
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
                            provider=YoutubeMusic.provider_name,
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
                        addedAt=datetime.now(timezone.utc),
                    )
                )

            results.append(
                BasePlaylistWithMediasResponse(
                    type="playlist",
                    description=playlist.description,
                    provider=YoutubeMusic.provider_name,
                    publicId=public_id,
                    url=f"/youtube-music/playlist/{public_id}",
                    providerUrl=f"https://music.youtube.com/playlist?list={public_id}",
                    name=playlist.title,
                    medias=song_responses,
                    contributors=[],
                    imageUrl=playlist.thumbnail_url,
                    owner=BaseArtistResponse(
                        provider=YoutubeMusic.provider_name,
                        publicId="",
                        url="",
                        providerUrl="",
                        name="",
                        imageUrl="",
                    ),
                )
            )

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @time_it
    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithoutMediasResponse]]:
        """Get YouTube Music playlists by public_ids without medias."""

        results: List[BasePlaylistWithoutMediasResponse] = []
        for public_id in public_ids:
            a_result_playlist: AResult[YoutubeMusicPlaylist] = (
                await YoutubeMusicApi.get_playlist_info_async(playlist_id=public_id)
            )
            if a_result_playlist.is_not_ok():
                logger.error(
                    f"Error getting YouTube Music playlist. {a_result_playlist.info()}"
                )
                continue

            playlist: YoutubeMusicPlaylist = a_result_playlist.result()

            results.append(
                BasePlaylistWithoutMediasResponse(
                    type="playlist",
                    description=playlist.description,
                    provider=YoutubeMusic.provider_name,
                    publicId=public_id,
                    url=f"/youtube-music/playlist/{public_id}",
                    providerUrl=f"https://music.youtube.com/playlist?list={public_id}",
                    name=playlist.title,
                    contributors=[],
                    imageUrl=playlist.thumbnail_url,
                    owner=BaseArtistResponse(
                        provider=YoutubeMusic.provider_name,
                        publicId="",
                        url="",
                        providerUrl="",
                        name="",
                        imageUrl="",
                    ),
                )
            )

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @time_it
    async def get_songs_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseSongWithAlbumResponse]]:
        """Get YouTube Music tracks by public_ids using batch method."""

        return await youtube_music.get_tracks_batch_async(
            session=session, public_ids=public_ids
        )

    @time_it
    async def get_albums_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseAlbumWithSongsResponse]]:
        """Get YouTube Music albums by public_ids using batch method."""

        return await youtube_music.get_albums_batch_async(
            session=session, public_ids=public_ids
        )

    @time_it
    async def get_artists_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseArtistResponse]]:
        """Get YouTube Music artists by public_ids."""

        results: List[BaseArtistResponse] = []
        for public_id in public_ids:
            a_result: AResult[BaseArtistResponse] = (
                await youtube_music.get_artist_async(
                    session=session, public_id=public_id
                )
            )
            if a_result.is_not_ok():
                logger.error(f"Error getting YouTube Music artist. {a_result.info()}")
                continue

            results.append(a_result.result())

        return AResult(code=AResultCode.OK, message="OK", result=results)

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
            a_result_playlists: AResult[List[BasePlaylistWithoutMediasResponse]] = (
                await self.get_playlists_without_medias_async(
                    session=session, user_id=0, public_ids=[resource_id]
                )
            )

            if a_result_playlists.is_not_ok():
                logger.error(
                    f"Error adding YouTube Music playlist from URL. {a_result_playlists.info()}"
                )
                return AResult(
                    code=a_result_playlists.code(),
                    message=a_result_playlists.message(),
                )

            playlists: List[BasePlaylistWithoutMediasResponse] = (
                a_result_playlists.result()
            )
            if not playlists:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Playlist not found",
                )

            return AResult[AddFromUrlAResult](
                code=a_result_playlists.code(),
                message="OK",
                result=playlists[0],
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
        a_result: AResult[str] = (
            await YoutubeMusicAccess.get_track_youtube_id_from_public_id_async(
                session=session, public_id=public_id
            )
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        youtube_id: str = a_result.result()

        a_result_track: AResult[TrackRow] = (
            await YoutubeMusicAccess.get_track_by_youtube_id_async(
                session=session, youtube_id=youtube_id
            )
        )
        if a_result_track.is_not_ok():
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        track: TrackRow = a_result_track.result()
        duration_ms = track.duration_ms or 0

        return AResult(code=AResultCode.OK, message="OK", result=duration_ms)


provider = YoutubeMusicProvider()
name = "YouTube Music"
