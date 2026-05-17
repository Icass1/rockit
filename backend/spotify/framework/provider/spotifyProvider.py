import re
from logging import Logger
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it

from backend.core.aResult import AResult, AResultCode

from backend.core.access.enumAccess import EnumAccess

from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework.models.urlPattern import UrlPattern

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

from backend.spotify.utils.conversions import (
    get_playlist_with_medias_response_async,
    get_playlist_without_medias_response_async,
    get_tracks_responses_async,
    get_artists_responses_async,
)

from backend.spotify.enums.copyrightTypeEnum import CopyrightTypeEnum

from backend.spotify.access.db.ormEnums.copyrightTypeEnum import CopyrightTypeEnumRow

from backend.spotify.framework.spotify import Spotify
from backend.spotify.framework.download.spotifyDownload import SpotifyDownload

from backend.spotify.responses.albumResponse import SpotifyAlbumResponse

logger: Logger = getLogger(__name__)

SPOTIFY_URL_PATTERNS: list[UrlPattern] = [
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/track/([a-zA-Z0-9]+)"),
        path_template="/spotify/track/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/album/([a-zA-Z0-9]+)"),
        path_template="/spotify/album/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/artist/([a-zA-Z0-9]+)"),
        path_template="/spotify/artist/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/playlist/([a-zA-Z0-9]+)"),
        path_template="/spotify/playlist/{}",
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
        """Get Spotify tracks by public_ids — bulk with minimal DB queries."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_mapping = await Spotify.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return AResult(
                code=a_result_mapping.code(), message=a_result_mapping.message()
            )

        public_id_to_spotify_id: Dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_all = await Spotify.get_tracks_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_all.is_not_ok():
            return AResult(code=a_result_all.code(), message=a_result_all.message())
        a_result_tracks = a_result_all

        a_result_responses = await get_tracks_responses_async(
            session=session,
            provider_name=Spotify.provider_name,
            track_rows=a_result_tracks.result(),
        )
        if a_result_responses.is_not_ok():
            return AResult(
                code=a_result_responses.code(), message=a_result_responses.message()
            )

        track_by_public_id: Dict[str, BaseSongWithAlbumResponse] = {
            r.publicId: r for r in a_result_responses.result()
        }

        results: List[BaseSongWithAlbumResponse] = [
            track_by_public_id[pid] for pid in public_ids if pid in track_by_public_id
        ]
        return AResult(code=AResultCode.OK, message="OK", result=results)

    @time_it
    async def get_albums_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseAlbumWithSongsResponse]]:
        """Get Spotify albums by public_ids — batched to minimise DB round-trips."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_rows = await Spotify.get_album_rows_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_rows.is_not_ok():
            logger.error(f"Error batch-fetching album rows. {a_result_rows.info()}")
            return AResult(code=a_result_rows.code(), message=a_result_rows.message())

        album_rows = a_result_rows.result()

        found_pids = {row.core_album.public_id for row in album_rows}
        missing_pids = [pid for pid in public_ids if pid not in found_pids]

        if missing_pids:
            a_result_missing = (
                await Spotify.get_albums_spotify_id_from_public_ids_async(
                    session=session, public_ids=missing_pids
                )
            )
            if a_result_missing.is_ok() and a_result_missing.result():
                missing_spotify_ids = list(a_result_missing.result().values())
                await Spotify.get_albums_async(
                    session=session, spotify_ids=missing_spotify_ids
                )
                a_result_rows = await Spotify.get_album_rows_from_public_ids_async(
                    session=session, public_ids=public_ids
                )
                if a_result_rows.is_ok():
                    album_rows = a_result_rows.result()

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

        album_by_public_id: Dict[str, BaseAlbumWithSongsResponse] = {
            r.publicId: r for r in a_result.result()
        }

        results: List[BaseAlbumWithSongsResponse] = [
            album_by_public_id[pid] for pid in public_ids if pid in album_by_public_id
        ]
        return AResult(code=AResultCode.OK, message="OK", result=results)

    @time_it
    async def get_artists_async(
        self, session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[BaseArtistResponse]]:
        """Get Spotify artists by public_ids — bulk with minimal DB queries."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_mapping = await Spotify.get_artists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return AResult(
                code=a_result_mapping.code(), message=a_result_mapping.message()
            )

        public_id_to_spotify_id: Dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        await Spotify.get_artists_async(session=session, spotify_ids=spotify_ids)

        a_result_artists = await Spotify.get_artists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_artists.is_not_ok():
            return AResult(
                code=a_result_artists.code(), message=a_result_artists.message()
            )

        a_result_responses = await get_artists_responses_async(
            session=session,
            provider_name=Spotify.provider_name,
            artist_rows=a_result_artists.result(),
        )
        if a_result_responses.is_not_ok():
            return AResult(
                code=a_result_responses.code(), message=a_result_responses.message()
            )

        artist_by_public_id: Dict[str, BaseArtistResponse] = {
            r.publicId: r for r in a_result_responses.result()
        }

        results: List[BaseArtistResponse] = [
            artist_by_public_id[pid] for pid in public_ids if pid in artist_by_public_id
        ]
        return AResult(code=AResultCode.OK, message="OK", result=results)

    @time_it
    async def get_playlists_with_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithMediasResponse]]:
        """Get Spotify playlists by public_ids with medias — bulk."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_mapping = await Spotify.get_playlists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return AResult(
                code=a_result_mapping.code(), message=a_result_mapping.message()
            )

        public_id_to_spotify_id: Dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        await Spotify.get_playlists_async(session=session, spotify_ids=spotify_ids)

        a_result_playlists = await Spotify.get_playlists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_playlists.is_not_ok():
            return AResult(
                code=a_result_playlists.code(), message=a_result_playlists.message()
            )

        results: List[BasePlaylistWithMediasResponse] = []
        for playlist_row in a_result_playlists.result():
            a_result = await get_playlist_with_medias_response_async(
                session=session,
                provider_name=Spotify.provider_name,
                playlist_row=playlist_row,
            )
            if a_result.is_ok():
                results.append(a_result.result())

        playlist_by_public_id: Dict[str, BasePlaylistWithMediasResponse] = {
            r.publicId: r for r in results
        }

        ordered: List[BasePlaylistWithMediasResponse] = [
            playlist_by_public_id[pid]
            for pid in public_ids
            if pid in playlist_by_public_id
        ]
        return AResult(code=AResultCode.OK, message="OK", result=ordered)

    @time_it
    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithoutMediasResponse]]:
        """Get Spotify playlists by public_ids without medias — bulk."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_mapping = await Spotify.get_playlists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return AResult(
                code=a_result_mapping.code(), message=a_result_mapping.message()
            )

        public_id_to_spotify_id: Dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        await Spotify.get_playlists_async(session=session, spotify_ids=spotify_ids)

        a_result_playlists = await Spotify.get_playlists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_playlists.is_not_ok():
            return AResult(
                code=a_result_playlists.code(), message=a_result_playlists.message()
            )

        results: List[BasePlaylistWithoutMediasResponse] = []
        for playlist_row in a_result_playlists.result():
            a_result = await get_playlist_without_medias_response_async(
                session=session,
                provider_name=Spotify.provider_name,
                playlist_row=playlist_row,
            )
            if a_result.is_ok():
                results.append(a_result.result())

        playlist_by_public_id: Dict[str, BasePlaylistWithoutMediasResponse] = {
            r.publicId: r for r in results
        }

        ordered: List[BasePlaylistWithoutMediasResponse] = [
            playlist_by_public_id[pid]
            for pid in public_ids
            if pid in playlist_by_public_id
        ]
        return AResult(code=AResultCode.OK, message="OK", result=ordered)

    async def start_download_async(
        self,
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> AResult[BaseDownload]:
        """Create a SpotifyDownload for the given track public_id."""

        a_result_mapping = await Spotify.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=[public_id]
        )
        if a_result_mapping.is_not_ok():
            logger.error(f"Error resolving public_id. {a_result_mapping.info()}")
            return AResult(
                code=a_result_mapping.code(), message=a_result_mapping.message()
            )

        mapping = a_result_mapping.result()
        spotify_id = mapping.get(public_id)
        if not spotify_id:
            return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

        a_result_tracks = await Spotify.get_tracks_from_db(
            session=session, spotify_ids=[spotify_id]
        )
        if a_result_tracks.is_not_ok() or not a_result_tracks.result():
            logger.error(f"Error getting track for download. {a_result_tracks.info()}")
            return AResult(
                code=a_result_tracks.code(), message=a_result_tracks.message()
            )

        track = a_result_tracks.result()[0]
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
        for up in SPOTIFY_URL_PATTERNS:
            match = up.pattern.match(url)
            if match:
                return up.path_template.format(match.group(1))
        return None

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        """Get the duration of a Spotify track in milliseconds."""

        a_result_mapping = await Spotify.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=[public_id]
        )
        if a_result_mapping.is_not_ok():
            return AResult(
                code=a_result_mapping.code(), message=a_result_mapping.message()
            )

        mapping = a_result_mapping.result()
        spotify_id = mapping.get(public_id)
        if not spotify_id:
            return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

        a_result_tracks = await Spotify.get_tracks_from_db(
            session=session, spotify_ids=[spotify_id]
        )
        if a_result_tracks.is_not_ok() or not a_result_tracks.result():
            return AResult(
                code=a_result_tracks.code(), message=a_result_tracks.message()
            )

        duration_ms = a_result_tracks.result()[0].duration_ms or 0
        return AResult(code=AResultCode.OK, message="OK", result=duration_ms)


provider = SpotifyProvider()
name = "Spotify"
