from typing import Dict, List, Set

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db

from backend.spotify.framework.spotifyApi import spotify_api
from backend.spotify.access.spotifyAccess import SpotifyAccess

from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.spotify.access.db.ormModels.track import TrackRow
from backend.spotify.access.db.ormModels.artist import ArtistRow

from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.spotify.spotifyApiTypes.rawSpotifyApiTrack import RawSpotifyApiTrack
from backend.spotify.spotifyApiTypes.rawSpotifyApiArtist import RawSpotifyApiArtist

from backend.spotify.responses.albumResponse import AlbumResponse
from backend.spotify.responses.songResponse import SongResponse
from backend.spotify.responses.artistResponse import ArtistResponse
from backend.spotify.responses.playlistResponse import PlaylistResponse

from backend.spotify.framework.provider.spotifyProvider import provider

logger = getLogger(__name__)


class Spotify:
    @staticmethod
    async def get_album_async(id: str) -> AResult[AlbumResponse]:
        """Get an album by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_album: AResult[AlbumRow] = await SpotifyAccess.get_album_async(id)
        if a_result_album.is_ok():
            album_row: AlbumRow = a_result_album.result()
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=AlbumResponse(
                    provider="Spotify",
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
        raw_artists: List[RawSpotifyApiArtist] = a_result_artists.result() if a_result_artists.is_ok() else []

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = provider.get_id()

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
                    a = await SpotifyAccess.get_or_create_artist(raw=raw_artist, session=session, provider_id=provider_id)
                    if a.is_ok():
                        artist_map[raw_artist.id] = a.result()

                a_album = await SpotifyAccess.get_or_create_album(
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
                       result=AlbumResponse(
                           provider="Spotify", publicId=id,
                           name=raw_album.name or ""))

    @staticmethod
    async def get_track_async(id: str) -> AResult[SongResponse]:
        """Get a track by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_track: AResult[TrackRow] = await SpotifyAccess.get_track_async(id)
        if a_result_track.is_ok():
            track_row = a_result_track.result()
            return AResult(code=AResultCode.OK, message="OK",
                           result=SongResponse(provider="Spotify", publicId=id,
                                               name=track_row.name))
        if a_result_track.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        # Fetch track from Spotify API.
        a_result_api_tracks: AResult[List[RawSpotifyApiTrack]] = \
            await spotify_api.get_tracks_async([id])
        if a_result_api_tracks.is_not_ok():
            return AResult(code=a_result_api_tracks.code(), message=a_result_api_tracks.message())

        raw_tracks = a_result_api_tracks.result()
        if not raw_tracks:
            return AResult(code=AResultCode.NOT_FOUND, message="Track not found on Spotify")

        raw_track = raw_tracks[0]

        # Fetch album.
        album_id = raw_track.album.id if raw_track.album else None
        album_ids = [album_id] if album_id else []

        a_result_albums: AResult[List[RawSpotifyApiAlbum]] = \
            await spotify_api.get_albums_async(album_ids)
        raw_albums = a_result_albums.result() if a_result_albums.is_ok() else []

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
        raw_artists = a_result_artists.result() if a_result_artists.is_ok() else []

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = provider.get_id()

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
                    a = await SpotifyAccess.get_or_create_artist(raw_artist, session, provider_id)
                    if a.is_ok():
                        artist_map[raw_artist.id] = a.result()

                album_row = None
                if raw_albums:
                    a_album = await SpotifyAccess.get_or_create_album(
                        raw_albums[0], artist_map, session, provider_id)
                    if a_album.is_not_ok():
                        return AResult(code=a_album.code(), message=a_album.message())
                    album_row = a_album.result()

                if album_row is None:
                    return AResult(code=AResultCode.GENERAL_ERROR,
                                   message="Could not resolve album for track")

                await SpotifyAccess.get_or_create_track(
                    raw_track, artist_map, album_row, session, provider_id)

        except Exception as e:
            return AResult(code=AResultCode.GENERAL_ERROR,
                           message=f"Failed to populate track in DB: {e}")

        return AResult(code=AResultCode.OK, message="OK",
                       result=SongResponse(provider="Spotify", publicId=id,
                                           name=raw_track.name or ""))

    @staticmethod
    async def get_artist_async(id: str) -> AResult[ArtistResponse]:
        """Get an artist by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_artist: AResult[ArtistRow] = await SpotifyAccess.get_artist_async(id)
        if a_result_artist.is_ok():
            artist_row = a_result_artist.result()
            return AResult(code=AResultCode.OK, message="OK",
                           result=ArtistResponse(publicId=id, provider="Spotify",
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
        a_result_provider_id: AResult[int] = provider.get_id()

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
                       result=ArtistResponse(publicId=id, provider="Spotify",
                                             name=raw_artist.name or ""))

    @staticmethod
    async def get_playlist_async(id: str) -> AResult[PlaylistResponse]:
        """Get a playlist by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        from backend.spotify.access.db.ormModels.playlist import SpotifyPlaylistRow
        a_result_playlist = await SpotifyAccess.get_playlist_async(id)
        if a_result_playlist.is_ok():
            playlist_row: SpotifyPlaylistRow = a_result_playlist.result()
            return AResult(code=AResultCode.OK, message="OK",
                           result=PlaylistResponse(provider="Spotify", publicId=id,
                                                   name=playlist_row.name))
        if a_result_playlist.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_playlist.code(), message=a_result_playlist.message())

        # Fetch playlist from Spotify API.
        a_result_api_playlist = await spotify_api.get_playlist_async(id)
        if a_result_api_playlist.is_not_ok():
            return AResult(code=a_result_api_playlist.code(),
                           message=a_result_api_playlist.message())

        raw_playlist = a_result_api_playlist.result()

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
        raw_albums = a_result_albums.result() if a_result_albums.is_ok() else []

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
        a_result_full_tracks: AResult[List[RawSpotifyApiTrack]] = \
            await spotify_api.get_tracks_async(track_ids)
        raw_full_tracks = a_result_full_tracks.result(
        ) if a_result_full_tracks.is_ok() else []
        full_track_map: Dict[str, RawSpotifyApiTrack] = {
            t.id: t for t in raw_full_tracks if t.id
        }

        # Populate DB in a single session.
        a_result_provider_id: AResult[int] = provider.get_id()

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
                    a = await SpotifyAccess.get_or_create_artist(raw_artist, session, provider_id)
                    if a.is_ok():
                        artist_map[raw_artist.id] = a.result()

                album_row_map: Dict[str, AlbumRow] = {}
                for raw_album in raw_albums:
                    if not raw_album.id:
                        continue
                    a_album = await SpotifyAccess.get_or_create_album(
                        raw_album, artist_map, session, provider_id)
                    if a_album.is_ok():
                        album_row_map[raw_album.id] = a_album.result()

                track_row_map: Dict[str, TrackRow] = {}
                for track_id in track_ids:
                    raw_track = full_track_map.get(track_id)
                    if not raw_track or not raw_track.id:
                        continue
                    album_id = raw_track.album.id if raw_track.album else None
                    album_row = album_row_map.get(
                        album_id) if album_id else None
                    if album_row is None:
                        continue
                    a_track = await SpotifyAccess.get_or_create_track(
                        raw_track, artist_map, album_row, session, provider_id)
                    if a_track.is_ok():
                        track_row_map[raw_track.id] = a_track.result()

                a_pl = await SpotifyAccess.get_or_create_playlist(
                    raw_playlist, track_row_map, session, provider_id)
                if a_pl.is_not_ok():
                    return AResult(code=a_pl.code(), message=a_pl.message())

        except Exception as e:
            return AResult(code=AResultCode.GENERAL_ERROR,
                           message=f"Failed to populate playlist in DB: {e}")

        return AResult(code=AResultCode.OK, message="OK",
                       result=PlaylistResponse(provider="Spotify", publicId=id,
                                               name=raw_playlist.name or ""))
