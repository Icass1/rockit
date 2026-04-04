import os
import re
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Set, TYPE_CHECKING, Tuple

from backend.utils.logger import getLogger

from backend.constants import MEDIA_PATH

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.core.responses.searchResponse import (
    BaseSearchResultsItem,
    ArtistSearchResultsItem,
)
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse

from backend.spotify.utils.conversions import (
    get_album_with_songs_response_async,
    get_artist_response_async,
    get_playlist_response_async,
    get_track_response_async,
)

from backend.spotify.access.spotifyAccess import SpotifyAccess
from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.spotify.access.db.ormModels.track import TrackRow
from backend.spotify.access.db.ormModels.artist import ArtistRow
from backend.spotify.access.db.ormModels.playlist import PlaylistRow

from backend.spotify.framework.spotifyApi import spotify_api

from backend.spotify.responses.songResponse import SpotifyTrackResponse
from backend.spotify.responses.albumResponse import SpotifyAlbumResponse
from backend.spotify.responses.artistResponse import SpotifyArtistResponse

from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.spotify.spotifyApiTypes.rawSpotifyApiTrack import RawSpotifyApiTrack
from backend.spotify.spotifyApiTypes.rawSpotifyApiArtist import RawSpotifyApiArtist
from backend.spotify.spotifyApiTypes.rawSpotifyApiPlaylist import RawSpotifyApiPlaylist
from backend.spotify.spotifyApiTypes.rawSpotifyApiSearchResults import (
    RawSpotifyApiSearchResults,
)

if TYPE_CHECKING:
    from backend.spotify.framework.provider.spotifyProvider import SpotifyProvider

logger = getLogger(__name__)


class Spotify:

    provider: "SpotifyProvider"
    provider_name: str

    @staticmethod
    async def search_async(query: str) -> AResult[List[BaseSearchResultsItem]]:
        """Search Spotify and map results to BaseSearchResultsItem list."""

        a_result_search: AResult[RawSpotifyApiSearchResults] = (
            await spotify_api.search_async(query)
        )
        if a_result_search.is_not_ok():
            logger.error(f"Error searching Spotify. {a_result_search.info()}")
            return AResult(
                code=a_result_search.code(), message=a_result_search.message()
            )

        raw: RawSpotifyApiSearchResults = a_result_search.result()
        items: List[BaseSearchResultsItem] = []

        if raw.tracks and raw.tracks.items:
            for track in raw.tracks.items:
                if not track.id or not track.name:
                    continue
                track_image_url: str = ""
                if track.album and track.album.images and track.album.images[0].url:
                    track_image_url = track.album.images[0].url
                track_artists: List[ArtistSearchResultsItem] = [
                    ArtistSearchResultsItem(name=a.name, url=f"/spotify/artist/{a.id}")
                    for a in track.artists
                    if a.id
                ]
                items.append(
                    BaseSearchResultsItem(
                        type="song",
                        title=track.name,
                        url=f"/spotify/track/{track.id}",
                        providerUrl=f"https://open.spotify.com/track/{track.id}",
                        imageUrl=track_image_url,
                        artists=track_artists,
                        provider=Spotify.provider_name,
                    )
                )

        if raw.albums and raw.albums.items:
            for album in raw.albums.items:
                if not album.id or not album.name:
                    continue
                album_image_url: str = ""
                if album.images and album.images[0].url:
                    album_image_url = album.images[0].url
                album_artists: List[ArtistSearchResultsItem] = [
                    ArtistSearchResultsItem(name=a.name, url=f"/spotify/artist/{a.id}")
                    for a in album.artists
                    if a.id
                ]
                items.append(
                    BaseSearchResultsItem(
                        type="album",
                        title=album.name,
                        url=f"/spotify/album/{album.id}",
                        providerUrl=f"https://open.spotify.com/album/{album.id}",
                        imageUrl=album_image_url,
                        artists=album_artists,
                        provider=Spotify.provider_name,
                    )
                )

        if raw.artists and raw.artists.items:
            for artist in raw.artists.items:
                if not artist.id or not artist.name:
                    continue
                artist_image_url: str = ""
                if artist.images and artist.images[0].url:
                    artist_image_url = artist.images[0].url
                items.append(
                    BaseSearchResultsItem(
                        type="artist",
                        title=artist.name,
                        url=f"/spotify/artist/{artist.id}",
                        providerUrl=f"https://open.spotify.com/artist/{artist.id}",
                        imageUrl=artist_image_url,
                        artists=[],
                        provider=Spotify.provider_name,
                    )
                )

        if raw.playlists and raw.playlists.items:
            for playlist in raw.playlists.items:
                if not playlist:
                    continue
                playlist_image_url: str = ""
                if playlist.images and playlist.images[0].url:
                    playlist_image_url = playlist.images[0].url
                items.append(
                    BaseSearchResultsItem(
                        type="playlist",
                        title=playlist.name,
                        url=f"/spotify/playlist/{playlist.id}",
                        providerUrl=f"https://open.spotify.com/playlist/{playlist.id}",
                        imageUrl=playlist_image_url,
                        artists=[],
                        provider=Spotify.provider_name,
                    )
                )

        return AResult(code=AResultCode.OK, message="OK", result=items)

    @staticmethod
    async def get_album_async(
        session: AsyncSession, spotify_id: str
    ) -> AResult[SpotifyAlbumResponse]:
        """Get an album by ID, fetching from Spotify API and populating the database if not found."""

        a_result_album: AResult[AlbumRow] = (
            await SpotifyAccess.get_album_public_id_async(
                session=session, spotify_id=spotify_id
            )
        )
        if a_result_album.is_ok():
            return await get_album_with_songs_response_async(
                session=session,
                provider_name=Spotify.provider_name,
                album_row=a_result_album.result(),
            )

        if a_result_album.code() != AResultCode.NOT_FOUND:
            logger.error("Error getting album from database.")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        # Fetch album from Spotify API (cache-first internally).
        a_result_api_albums: AResult[List[RawSpotifyApiAlbum]] = (
            await spotify_api.get_albums_async(session=session, ids=[spotify_id])
        )
        if a_result_api_albums.is_not_ok():
            logger.error("Error getting album from Spotify API.")
            return AResult(
                code=a_result_api_albums.code(), message=a_result_api_albums.message()
            )

        raw_albums: List[RawSpotifyApiAlbum] = a_result_api_albums.result()
        if not raw_albums:
            return AResult(
                code=AResultCode.NOT_FOUND, message="Album not found on Spotify"
            )

        raw_album: RawSpotifyApiAlbum = raw_albums[0]

        # Fetch tracks.
        track_ids: List[str] = []
        if raw_album.tracks and raw_album.tracks.items:
            track_ids = [item.id for item in raw_album.tracks.items if item.id]

        a_result_api_tracks: AResult[List[RawSpotifyApiTrack]] = (
            await spotify_api.get_tracks_async(session=session, ids=track_ids)
        )
        api_tracks: List[RawSpotifyApiTrack] = (
            a_result_api_tracks.result() if a_result_api_tracks.is_ok() else []
        )

        # Collect unique artist IDs.
        artist_ids: List[str] = list(
            {a.id for a in (raw_album.artists or []) if a.id}
            | {a.id for t in api_tracks for a in (t.artists or []) if a.id}
        )

        a_result_api_artists: AResult[List[RawSpotifyApiArtist]] = (
            await spotify_api.get_artists_async(session=session, ids=artist_ids)
        )
        api_artists: List[RawSpotifyApiArtist] = (
            a_result_api_artists.result() if a_result_api_artists.is_ok() else []
        )

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = Spotify.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )

        provider_id: int = a_result_provider_id.result()

        artist_map: Dict[str, ArtistRow] = {}
        for raw_artist in api_artists:
            if not raw_artist.id:
                continue
            a_result_create_artist: AResult[ArtistRow] = (
                await SpotifyAccess.get_or_create_artist(
                    raw=raw_artist, session=session, provider_id=provider_id
                )
            )
            if a_result_create_artist.is_ok():
                artist_map[raw_artist.id] = a_result_create_artist.result()

        a_album: AResult[AlbumRow] = await SpotifyAccess.get_or_create_album(
            raw=raw_album,
            artist_map=artist_map,
            session=session,
            provider_id=provider_id,
        )
        if a_album.is_not_ok():
            return AResult(code=a_album.code(), message=a_album.message())

        album_row: AlbumRow = a_album.result()

        for raw_track in api_tracks:
            await SpotifyAccess.get_or_create_track(
                raw=raw_track,
                artist_map=artist_map,
                album_row=album_row,
                session=session,
                provider_id=provider_id,
            )

        return await get_album_with_songs_response_async(
            session=session,
            provider_name=Spotify.provider_name,
            album_row=album_row,
        )

    @staticmethod
    async def get_track_async(
        session: AsyncSession, spotify_id: str
    ) -> AResult[SpotifyTrackResponse]:
        """Get a track by ID, fetching from Spotify API and populating the database if not found."""

        a_result_track: AResult[TrackRow] = (
            await SpotifyAccess.get_track_spotify_id_async(
                spotify_id=spotify_id, session=session
            )
        )
        if a_result_track.is_ok():
            return await get_track_response_async(
                session=session,
                provider_name=Spotify.provider_name,
                track_row=a_result_track.result(),
            )

        if a_result_track.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        # Fetch track from Spotify API.
        a_result_api_tracks: AResult[List[RawSpotifyApiTrack]] = (
            await spotify_api.get_tracks_async(session=session, ids=[spotify_id])
        )
        if a_result_api_tracks.is_not_ok():
            return AResult(
                code=a_result_api_tracks.code(), message=a_result_api_tracks.message()
            )

        raw_tracks: List[RawSpotifyApiTrack] = a_result_api_tracks.result()
        if not raw_tracks:
            logger.error(f"Track {spotify_id} not found on Spotify")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Track not found on Spotify"
            )

        raw_track: RawSpotifyApiTrack = raw_tracks[0]

        # Fetch full album to get all its tracks.
        album_id: str = raw_track.album.id

        a_result_albums: AResult[List[RawSpotifyApiAlbum]] = (
            await spotify_api.get_albums_async(session=session, ids=[album_id])
        )
        raw_albums: List[RawSpotifyApiAlbum] = (
            a_result_albums.result() if a_result_albums.is_ok() else []
        )

        if len(raw_albums) != 1:
            logger.error(f"Received {len(raw_albums)} instead of 1.")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Received {len(raw_albums)} instead of 1.",
            )

        raw_album: RawSpotifyApiAlbum = raw_albums[0]

        # Fetch all tracks of the album (same process as get_album_async).
        album_track_ids: List[str] = []
        if raw_album and raw_album.tracks and raw_album.tracks.items:
            album_track_ids = [item.id for item in raw_album.tracks.items if item.id]

        a_result_album_tracks: AResult[List[RawSpotifyApiTrack]] = (
            await spotify_api.get_tracks_async(session=session, ids=album_track_ids)
        )
        raw_album_tracks: List[RawSpotifyApiTrack] = (
            a_result_album_tracks.result() if a_result_album_tracks.is_ok() else []
        )

        # Collect artist IDs from all album tracks and the album itself.
        artist_ids: List[str] = list(
            {a.id for t in raw_album_tracks for a in (t.artists or []) if a.id}
            | {a.id for album in raw_albums for a in (album.artists or []) if a.id}
        )

        a_result_artists: AResult[List[RawSpotifyApiArtist]] = (
            await spotify_api.get_artists_async(session=session, ids=artist_ids)
        )
        raw_artists: List[RawSpotifyApiArtist] = (
            a_result_artists.result() if a_result_artists.is_ok() else []
        )

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = Spotify.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )

        created_core_song: CoreMediaRow | None = None
        provider_id: int = a_result_provider_id.result()
        artist_map: Dict[str, ArtistRow] = {}
        for raw_artist in raw_artists:
            if not raw_artist.id:
                continue
            a = await SpotifyAccess.get_or_create_artist(
                session=session,
                raw=raw_artist,
                provider_id=provider_id,
            )
            if a.is_ok():
                artist_map[raw_artist.id] = a.result()
            else:
                logger.error(
                    f"Failed to get/create artist {raw_artist.id}: {a.message()}"
                )

        a_result_album: AResult[AlbumRow] = await SpotifyAccess.get_or_create_album(
            raw=raw_album,
            artist_map=artist_map,
            session=session,
            provider_id=provider_id,
        )
        if a_result_album.is_not_ok():
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album_row: AlbumRow = a_result_album.result()

        for t in raw_album_tracks:
            a_result_create_track: AResult[Tuple[TrackRow, CoreMediaRow]] = (
                await SpotifyAccess.get_or_create_track(
                    raw=t,
                    artist_map=artist_map,
                    album_row=album_row,
                    provider_id=provider_id,
                    session=session,
                )
            )

            if a_result_create_track.is_not_ok():
                logger.error(
                    f"Error creating spotify track. {a_result_create_track.info()}"
                )
                continue

            if t.id == spotify_id:
                created_core_song = a_result_create_track.result()[1]

        if not created_core_song:
            return AResult(code=AResultCode.GENERAL_ERROR, message="core_song is None")

        a_result_fetched_track: AResult[TrackRow] = (
            await SpotifyAccess.get_track_spotify_id_async(
                session=session, spotify_id=spotify_id
            )
        )
        if a_result_fetched_track.is_not_ok():
            return AResult(
                code=a_result_fetched_track.code(),
                message=a_result_fetched_track.message(),
            )

        return await get_track_response_async(
            session=session,
            provider_name=Spotify.provider_name,
            track_row=a_result_fetched_track.result(),
        )

    @staticmethod
    async def get_artist_async(
        session: AsyncSession, spotify_id: str
    ) -> AResult[SpotifyArtistResponse]:
        """Get an artist by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_artist: AResult[ArtistRow] = (
            await SpotifyAccess.get_artist_public_id_async(
                session=session, spotify_id=spotify_id
            )
        )
        if a_result_artist.is_ok():
            return await get_artist_response_async(
                session=session,
                provider_name=Spotify.provider_name,
                artist_row=a_result_artist.result(),
            )

        if a_result_artist.code() != AResultCode.NOT_FOUND:
            return AResult(
                code=a_result_artist.code(), message=a_result_artist.message()
            )

        # Fetch from Spotify API.
        a_result_api_artists: AResult[List[RawSpotifyApiArtist]] = (
            await spotify_api.get_artists_async(session=session, ids=[spotify_id])
        )
        if a_result_api_artists.is_not_ok():
            return AResult(
                code=a_result_api_artists.code(), message=a_result_api_artists.message()
            )

        raw_artists = a_result_api_artists.result()
        if not raw_artists:
            return AResult(
                code=AResultCode.NOT_FOUND, message="Artist not found on Spotify"
            )

        raw_artist = raw_artists[0]

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = Spotify.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider. {a_result_provider_id.info()}")
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )

        provider_id: int = a_result_provider_id.result()

        a: AResult[ArtistRow] = await SpotifyAccess.get_or_create_artist(
            session=session, raw=raw_artist, provider_id=provider_id
        )
        if a.is_not_ok():
            return AResult(code=a.code(), message=a.message())

        a_result_fetched_artist: AResult[ArtistRow] = (
            await SpotifyAccess.get_artist_public_id_async(
                session=session, spotify_id=spotify_id
            )
        )
        if a_result_fetched_artist.is_not_ok():
            return AResult(
                code=a_result_fetched_artist.code(),
                message=a_result_fetched_artist.message(),
            )

        return await get_artist_response_async(
            session=session,
            provider_name=Spotify.provider_name,
            artist_row=a_result_fetched_artist.result(),
        )

    @staticmethod
    async def get_playlist_async(
        session: AsyncSession, spotify_id: str
    ) -> AResult[BasePlaylistResponse]:
        """Get a playlist by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_playlist: AResult[PlaylistRow] = (
            await SpotifyAccess.get_playlist_public_id_async(
                session=session, spotify_id=spotify_id
            )
        )
        if a_result_playlist.is_ok():
            return await get_playlist_response_async(
                session=session,
                provider_name=Spotify.provider_name,
                playlist_row=a_result_playlist.result(),
            )

        if a_result_playlist.code() != AResultCode.NOT_FOUND:
            return AResult(
                code=a_result_playlist.code(), message=a_result_playlist.message()
            )

        # Fetch playlist from Spotify API.
        a_result_api_playlist: AResult[RawSpotifyApiPlaylist] = (
            await spotify_api.get_playlist_async(session=session, id=spotify_id)
        )
        if a_result_api_playlist.is_not_ok():
            return AResult(
                code=a_result_api_playlist.code(),
                message=a_result_api_playlist.message(),
            )

        raw_playlist: RawSpotifyApiPlaylist = a_result_api_playlist.result()

        # Collect track IDs and album IDs from playlist items.
        track_ids: List[str] = []
        album_ids_set: Set[str] = set()
        if raw_playlist.tracks and raw_playlist.tracks.items:
            for item in raw_playlist.tracks.items:
                if item.track and item.track.id:
                    track_ids.append(item.track.id)
                if item.track and item.track.album and item.track.album.id:
                    album_ids_set.add(item.track.album.id)

        album_ids: List[str] = list(album_ids_set)

        # Fetch full albums (cache-first).
        a_result_albums: AResult[List[RawSpotifyApiAlbum]] = (
            await spotify_api.get_albums_async(session=session, ids=album_ids)
        )
        raw_albums: List[RawSpotifyApiAlbum] = (
            a_result_albums.result() if a_result_albums.is_ok() else []
        )

        # Collect all artist IDs from tracks and albums.
        artist_ids: List[str] = list(
            {
                a.id
                for item in (raw_playlist.tracks.items or [])
                if item.track
                for a in (item.track.artists or [])
                if a.id
            }
            | {a.id for album in raw_albums for a in (album.artists or []) if a.id}
        )

        a_result_artists: AResult[List[RawSpotifyApiArtist]] = (
            await spotify_api.get_artists_async(session=session, ids=artist_ids)
        )
        raw_artists: List[RawSpotifyApiArtist] = (
            a_result_artists.result() if a_result_artists.is_ok() else []
        )

        # Fetch full tracks (for ISRC).
        a_result_full_tracks: AResult[List[RawSpotifyApiTrack]] = (
            await spotify_api.get_tracks_async(session=session, ids=track_ids)
        )

        raw_full_tracks: List[RawSpotifyApiTrack] = (
            a_result_full_tracks.result() if a_result_full_tracks.is_ok() else []
        )
        full_track_map: Dict[str, RawSpotifyApiTrack] = {
            t.id: t for t in raw_full_tracks
        }

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = Spotify.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )

        provider_id: int = a_result_provider_id.result()
        artist_map: Dict[str, ArtistRow] = {}
        for raw_artist in raw_artists:
            if not raw_artist.id:
                continue
            a: AResult[ArtistRow] = await SpotifyAccess.get_or_create_artist(
                raw=raw_artist, provider_id=provider_id, session=session
            )
            if a.is_ok():
                artist_map[raw_artist.id] = a.result()

        album_row_map: Dict[str, AlbumRow] = {}
        for raw_album in raw_albums:
            if not raw_album.id:
                continue
            a_result_album: AResult[AlbumRow] = await SpotifyAccess.get_or_create_album(
                raw=raw_album,
                artist_map=artist_map,
                session=session,
                provider_id=provider_id,
            )
            if a_result_album.is_ok():
                album_row_map[raw_album.id] = a_result_album.result()

        track_row_map: Dict[str, TrackRow] = {}
        for track_id in track_ids:
            raw_track: RawSpotifyApiTrack | None = full_track_map.get(track_id)
            if not raw_track or not raw_track.id:
                continue
            raw_track_album_id: str = raw_track.album.id
            album_row: AlbumRow | None = album_row_map.get(raw_track_album_id)
            if album_row is None:
                continue
            a_result_track: AResult[Tuple[TrackRow, CoreMediaRow]] = (
                await SpotifyAccess.get_or_create_track(
                    raw=raw_track,
                    artist_map=artist_map,
                    album_row=album_row,
                    session=session,
                    provider_id=provider_id,
                )
            )
            if a_result_track.is_ok():
                track_row_map[raw_track.id] = a_result_track.result()[0]

        a_result_playlist = await SpotifyAccess.get_or_create_playlist(
            raw=raw_playlist,
            track_row_map=track_row_map,
            session=session,
            provider_id=provider_id,
        )

        if a_result_playlist.is_not_ok():
            return AResult(
                code=a_result_playlist.code(),
                message=a_result_playlist.message(),
            )

        a_result_fetched_playlist: AResult[PlaylistRow] = (
            await SpotifyAccess.get_playlist_public_id_async(
                session=session, spotify_id=spotify_id
            )
        )
        if a_result_fetched_playlist.is_not_ok():
            return AResult(
                code=a_result_fetched_playlist.code(),
                message=a_result_fetched_playlist.message(),
            )

        return await get_playlist_response_async(
            session=session,
            provider_name=Spotify.provider_name,
            playlist_row=a_result_fetched_playlist.result(),
        )

    # ── Bulk methods ───────────────────────────────────────────────────────────

    @staticmethod
    async def get_albums_from_db(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[AlbumRow]]:
        """Get albums from database by their Spotify IDs."""
        a_result = await SpotifyAccess.get_albums_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting albums from DB. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_missing_album_ids(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[str]]:
        """Get album IDs that are not in the database."""
        a_result_existing = await SpotifyAccess.get_albums_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        existing_ids: Set[str] = (
            {a.spotify_id for a in a_result_existing.result()}
            if a_result_existing.is_ok()
            else set()
        )
        missing_ids = [sid for sid in spotify_ids if sid not in existing_ids]
        return AResult(code=AResultCode.OK, message="OK", result=missing_ids)

    @staticmethod
    async def fetch_albums_from_spotify(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[RawSpotifyApiAlbum]]:
        """Fetch albums from Spotify API (via cache)."""
        a_result = await spotify_api.get_albums_async(session=session, ids=spotify_ids)
        if a_result.is_not_ok():
            logger.error(f"Error fetching albums from Spotify. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def fetch_tracks_from_spotify(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[RawSpotifyApiTrack]]:
        """Fetch tracks from Spotify API (via cache)."""
        a_result = await spotify_api.get_tracks_async(session=session, ids=spotify_ids)
        if a_result.is_not_ok():
            logger.error(f"Error fetching tracks from Spotify. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def fetch_artists_from_spotify(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[RawSpotifyApiArtist]]:
        """Fetch artists from Spotify API (via cache)."""
        a_result = await spotify_api.get_artists_async(session=session, ids=spotify_ids)
        if a_result.is_not_ok():
            logger.error(f"Error fetching artists from Spotify. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_albums_async(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[AlbumRow]]:
        """
        Get albums by Spotify IDs.
        1. Get existing albums from DB
        2. Identify missing albums
        3. Fetch missing albums from Spotify
        4. Fetch all tracks of missing albums
        5. Fetch all artists from tracks and albums
        6. Download images and insert into DB
        7. Insert albums, tracks, artists, etc.
        8. Return albums from DB
        """
        if not spotify_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_existing = await Spotify.get_albums_from_db(
            session=session, spotify_ids=spotify_ids
        )
        existing_albums: List[AlbumRow] = (
            a_result_existing.result() if a_result_existing.is_ok() else []
        )

        existing_album_ids: Set[str] = {a.spotify_id for a in existing_albums}
        spotify_ids_to_fetch: List[str] = [
            sid for sid in spotify_ids if sid not in existing_album_ids
        ]

        a_result_missing = await Spotify.get_missing_album_ids(
            session=session, spotify_ids=spotify_ids_to_fetch
        )
        if a_result_missing.is_not_ok():
            return AResult(
                code=a_result_missing.code(), message=a_result_missing.message()
            )

        missing_album_ids: List[str] = a_result_missing.result()
        if not missing_album_ids:
            return a_result_existing

        a_result_raw_albums = await Spotify.fetch_albums_from_spotify(
            session=session, spotify_ids=missing_album_ids
        )
        raw_albums: List[RawSpotifyApiAlbum] = (
            a_result_raw_albums.result() if a_result_raw_albums.is_ok() else []
        )

        track_ids: List[str] = []
        for raw_album in raw_albums:
            if raw_album.tracks and raw_album.tracks.items:
                for item in raw_album.tracks.items:
                    if item.id:
                        track_ids.append(item.id)

        a_result_raw_tracks = await Spotify.fetch_tracks_from_spotify(
            session=session, spotify_ids=track_ids
        )
        raw_tracks: List[RawSpotifyApiTrack] = (
            a_result_raw_tracks.result() if a_result_raw_tracks.is_ok() else []
        )

        artist_ids_set: Set[str] = set()
        for raw_album in raw_albums:
            if raw_album.artists:
                for a in raw_album.artists:
                    if a.id:
                        artist_ids_set.add(a.id)
        for raw_track in raw_tracks:
            if raw_track.artists:
                for a in raw_track.artists:
                    if a.id:
                        artist_ids_set.add(a.id)

        a_result_raw_artists = await Spotify.fetch_artists_from_spotify(
            session=session, spotify_ids=list(artist_ids_set)
        )
        raw_artists: List[RawSpotifyApiArtist] = (
            a_result_raw_artists.result() if a_result_raw_artists.is_ok() else []
        )

        a_result_provider_id: AResult[int] = Spotify.provider.get_id()
        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )

        provider_id: int = a_result_provider_id.result()

        artist_map: Dict[str, ArtistRow] = {}
        for raw_artist in raw_artists:
            if not raw_artist.id:
                continue
            a_result_artist = await SpotifyAccess.get_or_create_artist(
                session=session, raw=raw_artist, provider_id=provider_id
            )
            if a_result_artist.is_ok():
                artist_map[raw_artist.id] = a_result_artist.result()

        album_map: Dict[str, AlbumRow] = {}
        for raw_album in raw_albums:
            if not raw_album.id:
                continue
            a_result_album = await SpotifyAccess.get_or_create_album(
                session=session,
                raw=raw_album,
                artist_map=artist_map,
                provider_id=provider_id,
            )
            if a_result_album.is_ok():
                album_map[raw_album.id] = a_result_album.result()

        for raw_track in raw_tracks:
            if not raw_track.id:
                continue
            album_id = raw_track.album.id if raw_track.album else None
            album_row = album_map.get(album_id) if album_id else None
            if not album_row:
                continue
            await SpotifyAccess.get_or_create_track(
                session=session,
                raw=raw_track,
                artist_map=artist_map,
                album_row=album_row,
                provider_id=provider_id,
            )

        return await Spotify.get_albums_from_db(
            session=session, spotify_ids=spotify_ids
        )

    @staticmethod
    async def get_tracks_from_db(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[TrackRow]]:
        """Get tracks from database by their Spotify IDs."""
        a_result = await SpotifyAccess.get_tracks_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting tracks from DB. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_missing_track_ids(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[str]]:
        """Get track IDs that are not in the database."""
        a_result_existing = await SpotifyAccess.get_tracks_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        existing_ids: Set[str] = (
            {t.spotify_id for t in a_result_existing.result()}
            if a_result_existing.is_ok()
            else set()
        )
        missing_ids = [sid for sid in spotify_ids if sid not in existing_ids]
        return AResult(code=AResultCode.OK, message="OK", result=missing_ids)

    @staticmethod
    async def get_tracks_async(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[TrackRow]]:
        """
        Get tracks by Spotify IDs.
        1. Get existing tracks from DB
        2. Identify missing tracks
        3. Get album IDs from missing tracks
        4. Fetch albums from Spotify (which includes track data)
        5. Fetch artists from Spotify
        6. Insert everything into DB
        7. Return tracks from DB
        """
        if not spotify_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_existing = await Spotify.get_tracks_from_db(
            session=session, spotify_ids=spotify_ids
        )
        existing_tracks: List[TrackRow] = (
            a_result_existing.result() if a_result_existing.is_ok() else []
        )

        existing_track_ids: Set[str] = {t.spotify_id for t in existing_tracks}
        spotify_ids_to_fetch: List[str] = [
            sid for sid in spotify_ids if sid not in existing_track_ids
        ]

        a_result_missing = await Spotify.get_missing_track_ids(
            session=session, spotify_ids=spotify_ids_to_fetch
        )
        if a_result_missing.is_not_ok():
            return AResult(
                code=a_result_missing.code(), message=a_result_missing.message()
            )

        missing_track_ids: List[str] = a_result_missing.result()
        if not missing_track_ids:
            return a_result_existing

        a_result_raw_tracks = await Spotify.fetch_tracks_from_spotify(
            session=session, spotify_ids=missing_track_ids
        )
        raw_tracks: List[RawSpotifyApiTrack] = (
            a_result_raw_tracks.result() if a_result_raw_tracks.is_ok() else []
        )

        album_ids: Set[str] = set()
        for raw_track in raw_tracks:
            if raw_track.album and raw_track.album.id:
                album_ids.add(raw_track.album.id)

        if album_ids:
            await Spotify.get_albums_async(session=session, spotify_ids=list(album_ids))

        return await Spotify.get_tracks_from_db(
            session=session, spotify_ids=spotify_ids
        )

    @staticmethod
    async def get_artists_from_db(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[ArtistRow]]:
        """Get artists from database by their Spotify IDs."""
        a_result = await SpotifyAccess.get_artists_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting artists from DB. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_missing_artist_ids(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[str]]:
        """Get artist IDs that are not in the database."""
        a_result_existing = await SpotifyAccess.get_artists_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        existing_ids: Set[str] = (
            {a.spotify_id for a in a_result_existing.result()}
            if a_result_existing.is_ok()
            else set()
        )
        missing_ids = [sid for sid in spotify_ids if sid not in existing_ids]
        return AResult(code=AResultCode.OK, message="OK", result=missing_ids)

    @staticmethod
    async def get_artists_async(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[ArtistRow]]:
        """
        Get artists by Spotify IDs.
        1. Get existing artists from DB
        2. Identify missing artists
        3. Fetch missing artists from Spotify
        4. Download images and insert into DB
        5. Insert artists, genres, etc.
        6. Return artists from DB
        """
        if not spotify_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_existing = await Spotify.get_artists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        existing_artists: List[ArtistRow] = (
            a_result_existing.result() if a_result_existing.is_ok() else []
        )

        existing_artist_ids: Set[str] = {a.spotify_id for a in existing_artists}
        spotify_ids_to_fetch: List[str] = [
            sid for sid in spotify_ids if sid not in existing_artist_ids
        ]

        a_result_missing = await Spotify.get_missing_artist_ids(
            session=session, spotify_ids=spotify_ids_to_fetch
        )
        if a_result_missing.is_not_ok():
            return AResult(
                code=a_result_missing.code(), message=a_result_missing.message()
            )

        missing_artist_ids: List[str] = a_result_missing.result()
        if not missing_artist_ids:
            return a_result_existing

        a_result_raw_artists = await Spotify.fetch_artists_from_spotify(
            session=session, spotify_ids=missing_artist_ids
        )
        raw_artists: List[RawSpotifyApiArtist] = (
            a_result_raw_artists.result() if a_result_raw_artists.is_ok() else []
        )

        a_result_provider_id: AResult[int] = Spotify.provider.get_id()
        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )

        provider_id: int = a_result_provider_id.result()

        artist_map: Dict[str, ArtistRow] = {}
        for raw_artist in raw_artists:
            if not raw_artist.id:
                continue
            a_result_artist = await SpotifyAccess.get_or_create_artist(
                session=session, raw=raw_artist, provider_id=provider_id
            )
            if a_result_artist.is_ok():
                artist_map[raw_artist.id] = a_result_artist.result()

        return await Spotify.get_artists_from_db(
            session=session, spotify_ids=spotify_ids
        )

    @staticmethod
    async def get_playlists_from_db(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[PlaylistRow]]:
        """Get playlists from database by their Spotify IDs."""
        a_result = await SpotifyAccess.get_playlists_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting playlists from DB. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_missing_playlist_ids(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[str]]:
        """Get playlist IDs that are not in the database."""
        a_result_existing = await SpotifyAccess.get_playlists_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        existing_ids: Set[str] = (
            {p.spotify_id for p in a_result_existing.result()}
            if a_result_existing.is_ok()
            else set()
        )
        missing_ids = [sid for sid in spotify_ids if sid not in existing_ids]
        return AResult(code=AResultCode.OK, message="OK", result=missing_ids)

    @staticmethod
    async def get_playlists_async(
        session: AsyncSession, spotify_ids: List[str]
    ) -> AResult[List[PlaylistRow]]:
        """
        Get playlists by Spotify IDs.
        1. Get existing playlists from DB
        2. Identify missing playlists
        3. Fetch missing playlists from Spotify
        4. Get all track IDs from playlists
        5. Fetch albums for those tracks
        6. Fetch artists
        7. Insert everything into DB
        8. Return playlists from DB
        """
        if not spotify_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_existing = await Spotify.get_playlists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        existing_playlists: List[PlaylistRow] = (
            a_result_existing.result() if a_result_existing.is_ok() else []
        )

        existing_playlist_ids: Set[str] = {p.spotify_id for p in existing_playlists}
        spotify_ids_to_fetch: List[str] = [
            sid for sid in spotify_ids if sid not in existing_playlist_ids
        ]

        a_result_missing = await Spotify.get_missing_playlist_ids(
            session=session, spotify_ids=spotify_ids_to_fetch
        )
        if a_result_missing.is_not_ok():
            return AResult(
                code=a_result_missing.code(), message=a_result_missing.message()
            )

        missing_playlist_ids: List[str] = a_result_missing.result()
        if not missing_playlist_ids:
            return a_result_existing

        a_result_provider_id: AResult[int] = Spotify.provider.get_id()
        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )

        provider_id: int = a_result_provider_id.result()

        for playlist_id in missing_playlist_ids:
            a_result_raw_playlist = await spotify_api.get_playlist_async(
                session=session, id=playlist_id
            )
            if a_result_raw_playlist.is_not_ok():
                logger.error(
                    f"Error fetching playlist {playlist_id}. {a_result_raw_playlist.info()}"
                )
                continue

            raw_playlist: RawSpotifyApiPlaylist = a_result_raw_playlist.result()

            track_ids: List[str] = []
            album_ids: Set[str] = set()
            if raw_playlist.tracks and raw_playlist.tracks.items:
                for item in raw_playlist.tracks.items:
                    if item.track and item.track.id:
                        track_ids.append(item.track.id)
                    if item.track and item.track.album and item.track.album.id:
                        album_ids.add(item.track.album.id)

            if album_ids:
                await Spotify.get_albums_async(
                    session=session, spotify_ids=list(album_ids)
                )

            await Spotify.get_tracks_async(session=session, spotify_ids=track_ids)

            a_result_tracks = await Spotify.get_tracks_from_db(
                session=session, spotify_ids=track_ids
            )
            db_tracks: List[TrackRow] = (
                a_result_tracks.result() if a_result_tracks.is_ok() else []
            )
            track_row_map: Dict[str, TrackRow] = {t.spotify_id: t for t in db_tracks}

            await SpotifyAccess.get_or_create_playlist(
                session=session,
                raw=raw_playlist,
                track_row_map=track_row_map,
                provider_id=provider_id,
            )

        return await Spotify.get_playlists_from_db(
            session=session, spotify_ids=spotify_ids
        )

    @staticmethod
    async def get_audio_with_range_async(
        session: AsyncSession, spotify_id: str, request: Request
    ) -> AResult[tuple[bytes, int, str]]:
        """Get audio file bytes with HTTP range support for HTML audio element seeking.

        Returns: tuple of (content_bytes, status_code, content_range_header)
        """

        a_result_track: AResult[TrackRow] = (
            await SpotifyAccess.get_track_spotify_id_async(
                session=session, spotify_id=spotify_id
            )
        )
        if a_result_track.is_not_ok():
            logger.error(f"Error getting track. {a_result_track.info()}")
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        track_row: TrackRow = a_result_track.result()

        if not track_row.path:
            logger.error(f"Track {spotify_id} has no audio file downloaded.")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Audio file not downloaded"
            )

        full_path: str = os.path.join(MEDIA_PATH, track_row.path)
        if not os.path.exists(full_path):
            logger.error(f"Audio file not found at {full_path}")
            return AResult(code=AResultCode.NOT_FOUND, message="Audio file not found")

        file_size: int = os.path.getsize(full_path)
        range_header: str | None = request.headers.get("Range")

        if range_header:
            range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
            if range_match:
                start: int = int(range_match.group(1))
                end_str: str | None = range_match.group(2)
                end: int = int(end_str) if end_str else file_size - 1
            else:
                start = 0
                end = file_size - 1
        else:
            start = 0
            end = file_size - 1

        end = min(end, file_size - 1)
        content_length: int = end - start + 1

        with open(full_path, "rb") as f:
            f.seek(start)
            content: bytes = f.read(content_length)

        content_range: str = f"bytes {start}-{end}/{file_size}"
        status_code: int = 206 if range_header else 200

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=(content, status_code, content_range),
        )
