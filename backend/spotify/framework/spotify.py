from typing import Dict, List, Set, TYPE_CHECKING

from backend.utils.logger import getLogger

from backend.constants import BACKEND_URL
from backend.core.aResult import AResult, AResultCode

from backend.core.access.db import rockit_db

from backend.core.responses.baseAlbumResponse import BaseAlbumResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseSongResponse import BaseSongResponse
from backend.core.responses.searchResponse import BaseSearchItem

from backend.spotify.access.spotifyAccess import SpotifyAccess
from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.spotify.access.db.ormModels.track import TrackRow
from backend.spotify.access.db.ormModels.artist import ArtistRow

from backend.spotify.framework.spotifyApi import spotify_api

from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.spotify.spotifyApiTypes.rawSpotifyApiTrack import RawSpotifyApiTrack
from backend.spotify.spotifyApiTypes.rawSpotifyApiArtist import RawSpotifyApiArtist
from backend.spotify.spotifyApiTypes.rawSpotifyApiPlaylist import RawSpotifyApiPlaylist
from backend.spotify.spotifyApiTypes.rawSpotifyApiSearchResults import RawSpotifyApiSearchResults

if TYPE_CHECKING:
    from backend.spotify.framework.provider.spotifyProvider import SpotifyProvider

logger = getLogger(__name__)


class Spotify:

    provider: "SpotifyProvider"
    provider_name: str

    @staticmethod
    async def search_async(query: str) -> AResult[List[BaseSearchItem]]:
        """Search Spotify and map results to BaseSearchItem list."""

        a_result_search: AResult[RawSpotifyApiSearchResults] = await spotify_api.search_async(query)
        if a_result_search.is_not_ok():
            logger.error(f"Error searching Spotify. {a_result_search.info()}")
            return AResult(code=a_result_search.code(), message=a_result_search.message())

        raw: RawSpotifyApiSearchResults = a_result_search.result()
        items: List[BaseSearchItem] = []

        if raw.tracks and raw.tracks.items:
            for track in raw.tracks.items:
                if not track.id or not track.name:
                    continue
                artist_names: str = ", ".join(a.name for a in track.artists)
                items.append(BaseSearchItem(
                    type="track",
                    title=track.name,
                    subTitle=artist_names,
                    url=f"{BACKEND_URL}/spotify/song/{track.id}"))

        if raw.albums and raw.albums.items:
            for album in raw.albums.items:
                if not album.id or not album.name:
                    continue
                artist_names = ", ".join(a.name for a in album.artists)
                items.append(BaseSearchItem(
                    type="album",
                    title=album.name,
                    subTitle=artist_names,
                    url=f"{BACKEND_URL}/spotify/album/{album.id}"))

        if raw.artists and raw.artists.items:
            for artist in raw.artists.items:
                if not artist.id or not artist.name:
                    continue
                items.append(BaseSearchItem(
                    type="artist",
                    title=artist.name,
                    subTitle="Artist",
                    url=f"{BACKEND_URL}/spotify/artist/{artist.id}"))

        if raw.playlists and raw.playlists.items:
            for playlist in raw.playlists.items:
                if not playlist:
                    continue
                items.append(BaseSearchItem(
                    type="playlist",
                    title=playlist.name,
                    subTitle=playlist.owner.display_name,
                    url=f"{BACKEND_URL}/spotify/playlist/{playlist.id}"))

        return AResult(code=AResultCode.OK, message="OK", result=items)

    @staticmethod
    async def get_album_async(id: str) -> AResult[BaseAlbumResponse]:
        """Get an album by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_album: AResult[AlbumRow] = await SpotifyAccess.get_album_async(id)
        if a_result_album.is_ok():
            album_row: AlbumRow = a_result_album.result()
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=BaseAlbumResponse(
                    provider=Spotify.provider_name,
                    publicId=id,
                    name=album_row.name))

        if a_result_album.code() != AResultCode.NOT_FOUND:
            logger.error("Error getting album from database.")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        # Fetch album from Spotify API (cache-first internally).
        a_result_api_albums: AResult[List[RawSpotifyApiAlbum]] = await spotify_api.get_albums_async([id])
        if a_result_api_albums.is_not_ok():
            logger.error("Error getting album from Spotify API.")
            return AResult(code=a_result_api_albums.code(), message=a_result_api_albums.message())

        raw_albums: List[RawSpotifyApiAlbum] = a_result_api_albums.result()
        if not raw_albums:
            return AResult(code=AResultCode.NOT_FOUND, message="Album not found on Spotify")

        raw_album: RawSpotifyApiAlbum = raw_albums[0]

        # Fetch tracks.
        track_ids: List[str] = []
        if raw_album.tracks and raw_album.tracks.items:
            track_ids = [item.id for item in raw_album.tracks.items if item.id]

        a_result_tracks: AResult[List[RawSpotifyApiTrack]] = \
            await spotify_api.get_tracks_async(track_ids)
        raw_tracks = a_result_tracks.result() if a_result_tracks.is_ok() else []

        # Collect unique artist IDs.
        artist_ids = list({
            a.id
            for a in (raw_album.artists or [])
            if a.id
        } | {
            a.id
            for t in raw_tracks
            for a in (t.artists or [])
            if a.id
        })

        a_result_artists: AResult[List[RawSpotifyApiArtist]] = \
            await spotify_api.get_artists_async(artist_ids)
        raw_artists: List[RawSpotifyApiArtist] = a_result_artists.result(
        ) if a_result_artists.is_ok() else []

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = Spotify.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(
                f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id: int = a_result_provider_id.result()

        try:
            async with rockit_db.session_scope_async() as session:
                artist_map: Dict[str, ArtistRow] = {}
                for raw_artist in raw_artists:
                    if not raw_artist.id:
                        continue
                    a: AResult[ArtistRow] = await SpotifyAccess.get_or_create_artist(raw=raw_artist, session=session, provider_id=provider_id)
                    if a.is_ok():
                        artist_map[raw_artist.id] = a.result()

                a_album: AResult[AlbumRow] = await SpotifyAccess.get_or_create_album(
                    raw=raw_album, artist_map=artist_map, session=session, provider_id=provider_id)
                if a_album.is_not_ok():
                    return AResult(code=a_album.code(), message=a_album.message())

                album_row = a_album.result()

                for raw_track in raw_tracks:
                    await SpotifyAccess.get_or_create_track(
                        raw=raw_track, artist_map=artist_map, album_row=album_row, session=session, provider_id=provider_id)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to populate album in DB: {e}")

        return AResult(code=AResultCode.OK,
                       message="OK",
                       result=BaseAlbumResponse(
                           provider=Spotify.provider_name, publicId=id,
                           name=raw_album.name or ""))

    @staticmethod
    async def get_track_async(id: str) -> AResult[BaseSongResponse]:
        """Get a track by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_track: AResult[TrackRow] = await SpotifyAccess.get_track_async(id)
        if a_result_track.is_ok():
            track_row: TrackRow = a_result_track.result()
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=BaseSongResponse(
                    provider=Spotify.provider_name,
                    publicId=id,
                    name=track_row.name))
        if a_result_track.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        # Fetch track from Spotify API.
        a_result_api_tracks: AResult[List[RawSpotifyApiTrack]] = \
            await spotify_api.get_tracks_async([id])
        if a_result_api_tracks.is_not_ok():
            return AResult(code=a_result_api_tracks.code(), message=a_result_api_tracks.message())

        raw_tracks: List[RawSpotifyApiTrack] = a_result_api_tracks.result()
        if not raw_tracks:
            return AResult(code=AResultCode.NOT_FOUND, message="Track not found on Spotify")

        raw_track = raw_tracks[0]

        # Fetch album.
        album_id: str = raw_track.album.id
        album_ids: List[str] = [album_id]

        a_result_albums: AResult[List[RawSpotifyApiAlbum]] = \
            await spotify_api.get_albums_async(album_ids)
        raw_albums: List[RawSpotifyApiAlbum] = a_result_albums.result(
        ) if a_result_albums.is_ok() else []

        # Collect artist IDs.
        artist_ids = list({
            a.id
            for a in (raw_track.artists or [])
            if a.id
        } | {
            a.id
            for album in raw_albums
            for a in (album.artists or [])
            if a.id
        })

        a_result_artists: AResult[List[RawSpotifyApiArtist]] = \
            await spotify_api.get_artists_async(artist_ids)
        raw_artists: List[RawSpotifyApiArtist] = a_result_artists.result(
        ) if a_result_artists.is_ok() else []

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = Spotify.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(
                f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id: int = a_result_provider_id.result()
        try:
            async with rockit_db.session_scope_async() as session:
                artist_map: Dict[str, ArtistRow] = {}
                for raw_artist in raw_artists:
                    if not raw_artist.id:
                        continue
                    a = await SpotifyAccess.get_or_create_artist(raw_artist, session, provider_id)
                    if a.is_ok():
                        artist_map[raw_artist.id] = a.result()

                a_result_album: AResult[AlbumRow] = await SpotifyAccess.get_or_create_album(
                    raw=raw_albums[0],
                    artist_map=artist_map,
                    session=session,
                    provider_id=provider_id)
                if a_result_album.is_not_ok():
                    return AResult(code=a_result_album.code(), message=a_result_album.message())

                album_row: AlbumRow = a_result_album.result()

                await SpotifyAccess.get_or_create_track(
                    raw=raw_track,
                    artist_map=artist_map,
                    album_row=album_row,
                    session=session,
                    provider_id=provider_id)

        except Exception as e:
            return AResult(code=AResultCode.GENERAL_ERROR,
                           message=f"Failed to populate track in DB: {e}")

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BaseSongResponse(
                provider=Spotify.provider_name,
                publicId=id,
                name=raw_track.name))

    @staticmethod
    async def get_artist_async(id: str) -> AResult[BaseArtistResponse]:
        """Get an artist by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_artist: AResult[ArtistRow] = await SpotifyAccess.get_artist_async(id)
        if a_result_artist.is_ok():
            artist_row = a_result_artist.result()
            return AResult(code=AResultCode.OK, message="OK",
                           result=BaseArtistResponse(publicId=id, provider=Spotify.provider_name,
                                                     name=artist_row.name))
        if a_result_artist.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_artist.code(), message=a_result_artist.message())

        # Fetch from Spotify API.
        a_result_api_artists: AResult[List[RawSpotifyApiArtist]] = \
            await spotify_api.get_artists_async([id])
        if a_result_api_artists.is_not_ok():
            return AResult(code=a_result_api_artists.code(),
                           message=a_result_api_artists.message())

        raw_artists = a_result_api_artists.result()
        if not raw_artists:
            return AResult(code=AResultCode.NOT_FOUND, message="Artist not found on Spotify")

        raw_artist = raw_artists[0]

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = Spotify.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(
                f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id = a_result_provider_id.result()

        try:
            async with rockit_db.session_scope_async() as session:
                a = await SpotifyAccess.get_or_create_artist(raw_artist, session, provider_id)
                if a.is_not_ok():
                    return AResult(code=a.code(), message=a.message())

        except Exception as e:
            return AResult(code=AResultCode.GENERAL_ERROR,
                           message=f"Failed to populate artist in DB: {e}")

        return AResult(code=AResultCode.OK, message="OK",
                       result=BaseArtistResponse(publicId=id, provider=Spotify.provider_name,
                                                 name=raw_artist.name or ""))

    @staticmethod
    async def get_playlist_async(id: str) -> AResult[BasePlaylistResponse]:
        """Get a playlist by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        from backend.spotify.access.db.ormModels.playlist import SpotifyPlaylistRow
        a_result_playlist = await SpotifyAccess.get_playlist_async(id)
        if a_result_playlist.is_ok():
            playlist_row: SpotifyPlaylistRow = a_result_playlist.result()
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=BasePlaylistResponse(
                    provider=Spotify.provider_name,
                    publicId=id,
                    name=playlist_row.name))
        if a_result_playlist.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_playlist.code(), message=a_result_playlist.message())

        # Fetch playlist from Spotify API.
        a_result_api_playlist: AResult[RawSpotifyApiPlaylist] = await spotify_api.get_playlist_async(id)
        if a_result_api_playlist.is_not_ok():
            return AResult(code=a_result_api_playlist.code(),
                           message=a_result_api_playlist.message())

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

        album_ids = list(album_ids_set)

        # Fetch full albums (cache-first).
        a_result_albums: AResult[List[RawSpotifyApiAlbum]] = \
            await spotify_api.get_albums_async(album_ids)
        raw_albums: List[RawSpotifyApiAlbum] = a_result_albums.result(
        ) if a_result_albums.is_ok() else []

        # Collect all artist IDs from tracks and albums.
        artist_ids = list({
            a.id
            for item in (raw_playlist.tracks.items or [])
            if item.track
            for a in (item.track.artists or [])
            if a.id
        } | {
            a.id
            for album in raw_albums
            for a in (album.artists or [])
            if a.id
        })

        a_result_artists: AResult[List[RawSpotifyApiArtist]] = \
            await spotify_api.get_artists_async(artist_ids)
        raw_artists = a_result_artists.result() if a_result_artists.is_ok() else []

        # Fetch full tracks (for ISRC).
        a_result_full_tracks: AResult[List[RawSpotifyApiTrack]] = await spotify_api.get_tracks_async(track_ids)

        raw_full_tracks: List[RawSpotifyApiTrack] = a_result_full_tracks.result(
        ) if a_result_full_tracks.is_ok() else []
        full_track_map: Dict[str, RawSpotifyApiTrack] = {
            t.id: t for t in raw_full_tracks
        }

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = Spotify.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(
                f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id = a_result_provider_id.result()
        try:
            async with rockit_db.session_scope_async() as session:
                artist_map: Dict[str, ArtistRow] = {}
                for raw_artist in raw_artists:
                    if not raw_artist.id:
                        continue
                    a: AResult[ArtistRow] = await SpotifyAccess.get_or_create_artist(raw_artist, session, provider_id)
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
                        provider_id=provider_id)
                    if a_result_album.is_ok():
                        album_row_map[raw_album.id] = a_result_album.result()

                track_row_map: Dict[str, TrackRow] = {}
                for track_id in track_ids:
                    raw_track: RawSpotifyApiTrack | None = full_track_map.get(
                        track_id)
                    if not raw_track or not raw_track.id:
                        continue
                    album_id: str = raw_track.album.id
                    album_row: AlbumRow = album_row_map.get(album_id)
                    if album_row is None:
                        continue
                    a_result_track: AResult[TrackRow] = await SpotifyAccess.get_or_create_track(
                        raw=raw_track,
                        artist_map=artist_map,
                        album_row=album_row,
                        session=session,
                        provider_id=provider_id)
                    if a_result_track.is_ok():
                        track_row_map[raw_track.id] = a_result_track.result()

                a_result_playlist: AResult[SpotifyPlaylistRow] = await SpotifyAccess.get_or_create_playlist(
                    raw=raw_playlist,
                    track_row_map=track_row_map,
                    session=session,
                    provider_id=provider_id)

                if a_result_playlist.is_not_ok():
                    return AResult(code=a_result_playlist.code(), message=a_result_playlist.message())

        except Exception as e:
            logger.error(f"Failed to populate playlist in DB: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to populate playlist in DB: {e}")

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BasePlaylistResponse(
                provider=Spotify.provider_name,
                publicId=id,
                name=raw_playlist.name))
