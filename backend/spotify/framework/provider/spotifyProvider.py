import re
from logging import Logger
from typing import List, Pattern
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it

from backend.core.aResult import AResult, AResultCode

from backend.core.access.enumAccess import EnumAccess

from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.provider.baseProvider import BaseProvider

from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse

from backend.spotify.enums.copyrightTypeEnum import CopyrightTypeEnum

from backend.spotify.access.db.ormEnums.copyrightTypeEnum import CopyrightTypeEnumRow
from backend.spotify.access.spotifyAccess import SpotifyAccess
from backend.spotify.access.trackAccess import TrackAccess
from backend.spotify.access.db.ormModels.track import TrackRow

from backend.spotify.framework.spotify import Spotify
from backend.spotify.framework.download.spotifyDownload import SpotifyDownload

from backend.spotify.responses.albumResponse import SpotifyAlbumResponse
from backend.spotify.responses.artistResponse import SpotifyArtistResponse
from backend.spotify.responses.songResponse import SpotifyTrackResponse

logger: Logger = getLogger(__name__)

SPOTIFY_URL_PATTERNS: list[tuple[Pattern[str], str]] = [
    (
        re.compile(r"https?://open\.spotify\.com/track/([a-zA-Z0-9]+)"),
        "/spotify/track/{}",
    ),
    (
        re.compile(r"https?://open\.spotify\.com/album/([a-zA-Z0-9]+)"),
        "/spotify/album/{}",
    ),
    (
        re.compile(r"https?://open\.spotify\.com/artist/([a-zA-Z0-9]+)"),
        "/spotify/artist/{}",
    ),
    (
        re.compile(r"https?://open\.spotify\.com/playlist/([a-zA-Z0-9]+)"),
        "/spotify/playlist/{}",
    ),
]


class SpotifyProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        Spotify.provider_name = provider_name
        Spotify.provider = self

        self._id = provider_id
        self._name = provider_name

    async def async_init(self, session: AsyncSession) -> None:
        await self.add_enum_contents(session=session)

    async def add_enum_contents(self, session: AsyncSession) -> None:
        """Populate provider-owned enum tables in the database."""

        await EnumAccess.check_enum_contents_async(
            session=session, enum_class=CopyrightTypeEnum, table=CopyrightTypeEnumRow
        )

    @time_it
    async def search_async(self, query: str) -> AResult[List[BaseSearchResultsItem]]:
        """Search Spotify and return a list of search items."""

        return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result: AResult[List[BaseSearchResultsItem]] = await Spotify.search_async(
            query
        )
        if a_result.is_not_ok():
            logger.error(f"Error searching Spotify. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @time_it
    async def get_songs_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseSongWithAlbumResponse]]:
        """Get Spotify tracks by public_ids."""

        results: List[BaseSongWithAlbumResponse] = []
        for public_id in public_ids:
            a_result_spotify_id: AResult[str] = (
                await SpotifyAccess.get_track_spotify_id_from_public_id_async(
                    session=session, public_id=public_id
                )
            )
            if a_result_spotify_id.is_not_ok():
                logger.error(
                    f"Error getting spotify_id from public_id. {a_result_spotify_id.info()}"
                )
                continue

            spotify_id: str = a_result_spotify_id.result()

            a_result: AResult[SpotifyTrackResponse] = await Spotify.get_track_async(
                session=session, spotify_id=spotify_id
            )
            if a_result.is_not_ok():
                logger.error(f"Error getting Spotify track. {a_result.info()}")
                continue

            results.append(a_result.result())

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @time_it
    async def get_albums_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseAlbumWithSongsResponse]]:
        """Get Spotify albums by public_ids — batched to minimise DB round-trips."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        # One query to load all AlbumRows (artists/image/core_album selectin-loaded)
        a_result_rows = await SpotifyAccess.get_album_rows_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_rows.is_not_ok():
            logger.error(f"Error batch-fetching album rows. {a_result_rows.info()}")
            return AResult(code=a_result_rows.code(), message=a_result_rows.message())

        album_rows = a_result_rows.result()

        # Fallback: fetch albums not yet in DB (edge-case — shouldn't happen for library items)
        found_pids = {row.core_album.public_id for row in album_rows}
        missing_pids = [pid for pid in public_ids if pid not in found_pids]
        for missing_pid in missing_pids:
            logger.warning(
                f"Album not found in DB for public_id {missing_pid}, fetching individually."
            )
            a_sid = await SpotifyAccess.get_album_spotify_id_from_public_id_async(
                session=session, public_id=missing_pid
            )
            if a_sid.is_not_ok():
                logger.error(f"Could not resolve spotify_id for {missing_pid}.")
                continue
            a_album = await Spotify.get_album_async(
                session=session, spotify_id=a_sid.result()
            )
            if a_album.is_ok():
                # Re-fetch as AlbumRow so bulk builder can process it uniformly
                a_re = await SpotifyAccess.get_album_rows_from_public_ids_async(
                    session=session, public_ids=[missing_pid]
                )
                if a_re.is_ok() and a_re.result():
                    album_rows.extend(a_re.result())

        # Build all responses with ~6 queries total regardless of album count
        # Local import to avoid circular dependency (spotifyProvider → spotify → conversions)
        from backend.spotify.utils.conversions import (
            get_albums_with_songs_responses_async,
        )

        a_result: AResult[List[SpotifyAlbumResponse]] = (
            await get_albums_with_songs_responses_async(
                session=session,
                provider_name=Spotify.provider_name,
                album_rows=album_rows,
            )
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        # SpotifyAlbumResponse is a subclass of BaseAlbumWithSongsResponse
        base_albums: List[BaseAlbumWithSongsResponse] = list(a_result.result())
        return AResult(code=AResultCode.OK, message="OK", result=base_albums)

    @time_it
    async def get_artists_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseArtistResponse]]:
        """Get Spotify artists by public_ids."""

        results: List[BaseArtistResponse] = []
        for public_id in public_ids:
            a_result_spotify_id: AResult[str] = (
                await SpotifyAccess.get_artist_spotify_id_from_public_id_async(
                    session=session, public_id=public_id
                )
            )
            if a_result_spotify_id.is_not_ok():
                logger.error(
                    f"Error getting spotify_id from public_id. {a_result_spotify_id.info()}"
                )
                continue

            spotify_id: str = a_result_spotify_id.result()

            a_result: AResult[SpotifyArtistResponse] = await Spotify.get_artist_async(
                session, spotify_id
            )
            if a_result.is_not_ok():
                logger.error(f"Error getting Spotify artist. {a_result.info()}")
                continue

            results.append(a_result.result())

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @time_it
    async def get_playlists_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistResponse]]:
        """Get Spotify playlists by public_ids."""

        results: List[BasePlaylistResponse] = []
        for public_id in public_ids:
            a_result_spotify_id: AResult[str] = (
                await SpotifyAccess.get_playlist_spotify_id_from_public_id_async(
                    session=session, public_id=public_id
                )
            )
            if a_result_spotify_id.is_not_ok():
                logger.error(
                    f"Error getting spotify_id from public_id. {a_result_spotify_id.info()}"
                )
                continue

            spotify_id: str = a_result_spotify_id.result()

            a_result: AResult[BasePlaylistResponse] = await Spotify.get_playlist_async(
                session=session, spotify_id=spotify_id
            )
            if a_result.is_not_ok():
                logger.error(f"Error getting Spotify playlist. {a_result.info()}")
                continue

            results.append(a_result.result())

        return AResult(code=AResultCode.OK, message="OK", result=results)

    async def start_download_async(
        self,
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> AResult[BaseDownload]:
        """Create a SpotifyDownload for the given track public_id."""

        a_result_spotify_id: AResult[str] = (
            await SpotifyAccess.get_track_spotify_id_from_public_id_async(
                session=session, public_id=public_id
            )
        )
        if a_result_spotify_id.is_not_ok():
            logger.error(
                f"Error getting spotify_id from public_id. {a_result_spotify_id.info()}"
            )
            return AResult(
                code=a_result_spotify_id.code(), message=a_result_spotify_id.message()
            )

        spotify_id: str = a_result_spotify_id.result()

        a_result: AResult[TrackRow] = await SpotifyAccess.get_track_spotify_id_async(
            session=session, spotify_id=spotify_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting track for download. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        track: TrackRow = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=SpotifyDownload(
                public_id=public_id,
                download_id=download_id,
                download_group_id=download_group_id,
                user_id=user_id,
                track_spotify_id=track.id,
                download_url=track.download_url,
            ),
        )

    def match_url(self, url: str) -> str | None:
        """Check if the URL is a Spotify URL and return the internal path."""
        for pattern, path_template in SPOTIFY_URL_PATTERNS:
            match = pattern.match(url)
            if match:
                return path_template.format(match.group(1))
        return None

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        """Get the duration of a Spotify track in milliseconds."""
        a_result_spotify_id: AResult[str] = (
            await SpotifyAccess.get_track_spotify_id_from_public_id_async(
                session=session, public_id=public_id
            )
        )
        if a_result_spotify_id.is_not_ok():
            return AResult(
                code=a_result_spotify_id.code(), message=a_result_spotify_id.message()
            )

        spotify_id: str = a_result_spotify_id.result()

        a_result_track: AResult[TrackRow] = (
            await TrackAccess.get_track_by_spotify_id_async(
                session=session, spotify_id=spotify_id
            )
        )
        if a_result_track.is_not_ok():
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        track: TrackRow = a_result_track.result()
        duration_ms = track.duration_ms or 0

        return AResult(code=AResultCode.OK, message="OK", result=duration_ms)


provider = SpotifyProvider()
name = "Spotify"
