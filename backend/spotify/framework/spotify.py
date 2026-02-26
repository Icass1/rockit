from typing import Dict, List, Set, TYPE_CHECKING, Tuple

from backend.constants import BACKEND_URL
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.song import CoreSongRow
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.mediaAccess import MediaAccess

from backend.core.responses.searchResponse import BaseSearchResultsItem
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseSongAlbumResponse import BaseSongAlbumResponse

from backend.spotify.access.spotifyAccess import SpotifyAccess
from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.spotify.access.db.ormModels.track import TrackRow
from backend.spotify.access.db.ormModels.artist import ArtistRow
from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow

from backend.spotify.framework.spotifyApi import spotify_api

from backend.spotify.responses.songResponse import SongResponse
from backend.spotify.responses.albumResponse import AlbumResponse
from backend.spotify.responses.externalImageResponse import ExternalImageResponse

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
                artist_names: str = ", ".join(a.name for a in track.artists)
                items.append(
                    BaseSearchResultsItem(
                        type="track",
                        title=track.name,
                        subTitle=artist_names,
                        url=f"{BACKEND_URL}/spotify/song/{track.id}",
                    )
                )

        if raw.albums and raw.albums.items:
            for album in raw.albums.items:
                if not album.id or not album.name:
                    continue
                artist_names = ", ".join(a.name for a in album.artists)
                items.append(
                    BaseSearchResultsItem(
                        type="album",
                        title=album.name,
                        subTitle=artist_names,
                        url=f"{BACKEND_URL}/spotify/album/{album.id}",
                    )
                )

        if raw.artists and raw.artists.items:
            for artist in raw.artists.items:
                if not artist.id or not artist.name:
                    continue
                items.append(
                    BaseSearchResultsItem(
                        type="artist",
                        title=artist.name,
                        subTitle="Artist",
                        url=f"{BACKEND_URL}/spotify/artist/{artist.id}",
                    )
                )

        if raw.playlists and raw.playlists.items:
            for playlist in raw.playlists.items:
                if not playlist:
                    continue
                items.append(
                    BaseSearchResultsItem(
                        type="playlist",
                        title=playlist.name,
                        subTitle=playlist.owner.display_name,
                        url=f"{BACKEND_URL}/spotify/playlist/{playlist.id}",
                    )
                )

        return AResult(code=AResultCode.OK, message="OK", result=items)

    @staticmethod
    async def get_album_async(spotify_id: str) -> AResult[AlbumResponse]:
        """Get an album by ID, fetching from Spotify API and populating the database if not found."""

        song_responses: List[SongResponse]

        a_result_album: AResult[AlbumRow] = (
            await SpotifyAccess.get_album_public_id_async(spotify_id=spotify_id)
        )
        if a_result_album.is_ok():
            album_row: AlbumRow = a_result_album.result()

            a_result_core_album: AResult[CoreAlbumRow] = (
                await MediaAccess.get_album_from_id_async(id=album_row.id)
            )
            if a_result_core_album.is_not_ok():
                logger.error(f"Error getting core album. {a_result_core_album.info()}")
                return AResult(
                    code=a_result_core_album.code(),
                    message=a_result_core_album.message(),
                )

            core_album: CoreAlbumRow = a_result_core_album.result()

            a_result_artists: AResult[List[ArtistRow]] = (
                await SpotifyAccess.get_artists_from_album_id_async(
                    album_id=album_row.id
                )
            )
            artists: List[ArtistRow] = (
                a_result_artists.result() if a_result_artists.is_ok() else []
            )

            a_result_tracks: AResult[List[Tuple[TrackRow, CoreSongRow]]] = (
                await SpotifyAccess.get_tracks_with_core_song_from_album_async(
                    album_id=album_row.id
                )
            )
            tracks_with_core: List[Tuple[TrackRow, CoreSongRow]] = (
                a_result_tracks.result() if a_result_tracks.is_ok() else []
            )

            a_result_external_images: AResult[List[ExternalImageRow]] = (
                await SpotifyAccess.get_external_images_from_album_id_async(
                    album_id=album_row.id
                )
            )
            external_images: List[ExternalImageRow] = (
                a_result_external_images.result()
                if a_result_external_images.is_ok()
                else []
            )

            a_result_internal_image: AResult[ImageRow] = (
                await MediaAccess.get_image_from_id_async(
                    id=album_row.internal_image_id
                )
            )
            internal_image_url: str = ""
            if a_result_internal_image.is_ok():
                internal_image_url = f"{BACKEND_URL}/media/image/{a_result_internal_image.result().public_id}"

            artist_responses: List[BaseArtistResponse] = []
            for a in artists:
                artist_internal_image_url: str = ""
                if a.internal_image_id:
                    a_result_artist_image: AResult[ImageRow] = (
                        await MediaAccess.get_image_from_id_async(
                            id=a.internal_image_id
                        )
                    )
                    if a_result_artist_image.is_ok():
                        artist_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_artist_image.result().public_id}"

                a_result_genres: AResult[List[str]] = (
                    await SpotifyAccess.get_genres_from_artist_async(artist=a)
                )
                genres: List[str] = (
                    a_result_genres.result() if a_result_genres.is_ok() else []
                )

                artist_responses.append(
                    BaseArtistResponse(
                        provider=Spotify.provider_name,
                        publicId=a.spotify_id,
                        name=a.name,
                        internalImageUrl=artist_internal_image_url,
                        genres=genres,
                    )
                )

            song_responses = []
            for track_row, core_song in tracks_with_core:
                track_artists: List[ArtistRow] = []
                a_result_track_artists: AResult[List[ArtistRow]] = (
                    await SpotifyAccess.get_artists_from_track_row_async(
                        track_row=track_row
                    )
                )
                if a_result_track_artists.is_ok():
                    track_artists = a_result_track_artists.result()

                track_artist_responses: List[BaseArtistResponse] = []
                for ta in track_artists:
                    ta_image_url: str = ""
                    if ta.internal_image_id:
                        a_result_ta_image: AResult[ImageRow] = (
                            await MediaAccess.get_image_from_id_async(
                                id=ta.internal_image_id
                            )
                        )
                        if a_result_ta_image.is_ok():
                            ta_image_url = f"{BACKEND_URL}/media/image/{a_result_ta_image.result().public_id}"

                    a_result_ta_genres: AResult[List[str]] = (
                        await SpotifyAccess.get_genres_from_artist_async(artist=ta)
                    )
                    ta_genres: List[str] = (
                        a_result_ta_genres.result()
                        if a_result_ta_genres.is_ok()
                        else []
                    )

                    track_artist_responses.append(
                        BaseArtistResponse(
                            provider=Spotify.provider_name,
                            publicId=ta.spotify_id,
                            name=ta.name,
                            internalImageUrl=ta_image_url,
                            genres=ta_genres,
                        )
                    )

                track_internal_image_url: str = ""
                if track_row.internal_image_id:
                    a_result_track_image: AResult[ImageRow] = (
                        await MediaAccess.get_image_from_id_async(
                            id=track_row.internal_image_id
                        )
                    )
                    if a_result_track_image.is_ok():
                        track_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_track_image.result().public_id}"

                is_downloaded: bool = track_row.path is not None
                audio_src: str | None = None
                if is_downloaded:
                    audio_src = f"{BACKEND_URL}/spotify/audio/{track_row.spotify_id}"

                song_responses.append(
                    SongResponse(
                        provider=Spotify.provider_name,
                        publicId=core_song.public_id,
                        name=track_row.name,
                        spotifyId=track_row.spotify_id,
                        artists=track_artist_responses,
                        audioSrc=audio_src,
                        downloaded=is_downloaded,
                        internalImageUrl=track_internal_image_url,
                        album=BaseSongAlbumResponse(
                            provider=Spotify.provider_name,
                            publicId=album_row.spotify_id,
                            name=album_row.name,
                            artists=artist_responses,
                            releaseDate=album_row.release_date,
                            internalImageUrl=internal_image_url,
                        ),
                    )
                )

            external_image_responses: List[ExternalImageResponse] = [
                ExternalImageResponse(url=img.url, width=img.width, height=img.height)
                for img in external_images
            ]

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=AlbumResponse(
                    provider=Spotify.provider_name,
                    publicId=core_album.public_id,
                    spotifyId=spotify_id,
                    name=album_row.name,
                    artists=artist_responses,
                    songs=song_responses,
                    releaseDate=album_row.release_date,
                    externalImages=external_image_responses,
                    internalImageUrl=internal_image_url,
                ),
            )

        if a_result_album.code() != AResultCode.NOT_FOUND:
            logger.error("Error getting album from database.")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        # Fetch album from Spotify API (cache-first internally).
        a_result_api_albums: AResult[List[RawSpotifyApiAlbum]] = (
            await spotify_api.get_albums_async([spotify_id])
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
            await spotify_api.get_tracks_async(track_ids)
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
            await spotify_api.get_artists_async(artist_ids)
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

        try:
            async with rockit_db.session_scope_async() as session:
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

                album_row = a_album.result()

                for raw_track in api_tracks:
                    await SpotifyAccess.get_or_create_track(
                        raw=raw_track,
                        artist_map=artist_map,
                        album_row=album_row,
                        session=session,
                        provider_id=provider_id,
                    )

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to populate album in DB: {e}",
            )

        a_result_core_album: AResult[CoreAlbumRow] = (
            await MediaAccess.get_album_from_id_async(id=album_row.id)
        )
        if a_result_core_album.is_not_ok():
            logger.error(f"Error getting core album. {a_result_core_album.info()}")
            return AResult(
                code=a_result_core_album.code(), message=a_result_core_album.message()
            )

        core_album: CoreAlbumRow = a_result_core_album.result()

        a_result_db_artists: AResult[List[ArtistRow]] = (
            await SpotifyAccess.get_artists_from_album_id_async(album_id=album_row.id)
        )
        artists: List[ArtistRow] = (
            a_result_db_artists.result() if a_result_db_artists.is_ok() else []
        )

        a_result_db_tracks: AResult[List[Tuple[TrackRow, CoreSongRow]]] = (
            await SpotifyAccess.get_tracks_with_core_song_from_album_async(
                album_id=album_row.id
            )
        )
        tracks_with_core: List[Tuple[TrackRow, CoreSongRow]] = (
            a_result_db_tracks.result() if a_result_db_tracks.is_ok() else []
        )

        a_result_external_images: AResult[List[ExternalImageRow]] = (
            await SpotifyAccess.get_external_images_from_album_id_async(
                album_id=album_row.id
            )
        )
        external_images: List[ExternalImageRow] = (
            a_result_external_images.result()
            if a_result_external_images.is_ok()
            else []
        )

        a_result_internal_image: AResult[ImageRow] = (
            await MediaAccess.get_image_from_id_async(id=album_row.internal_image_id)
        )
        internal_image_url: str = ""
        if a_result_internal_image.is_ok():
            internal_image_url = f"{BACKEND_URL}/media/image/{a_result_internal_image.result().public_id}"

        artist_responses: List[BaseArtistResponse] = []
        for a in artists:
            artist_internal_image_url: str = ""
            if a.internal_image_id:
                a_result_artist_image: AResult[ImageRow] = (
                    await MediaAccess.get_image_from_id_async(id=a.internal_image_id)
                )
                if a_result_artist_image.is_ok():
                    artist_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_artist_image.result().public_id}"

            a_result_genres: AResult[List[str]] = (
                await SpotifyAccess.get_genres_from_artist_async(artist=a)
            )
            genres: List[str] = (
                a_result_genres.result() if a_result_genres.is_ok() else []
            )

            artist_responses.append(
                BaseArtistResponse(
                    provider=Spotify.provider_name,
                    publicId=a.spotify_id,
                    name=a.name,
                    internalImageUrl=artist_internal_image_url,
                    genres=genres,
                )
            )

        song_responses = []
        for track_row, core_song in tracks_with_core:
            track_artists: List[ArtistRow] = []
            a_result_track_artists: AResult[List[ArtistRow]] = (
                await SpotifyAccess.get_artists_from_track_row_async(
                    track_row=track_row
                )
            )
            if a_result_track_artists.is_ok():
                track_artists = a_result_track_artists.result()

            track_artist_responses: List[BaseArtistResponse] = []
            for ta in track_artists:
                ta_image_url: str = ""
                if ta.internal_image_id:
                    a_result_ta_image: AResult[ImageRow] = (
                        await MediaAccess.get_image_from_id_async(
                            id=ta.internal_image_id
                        )
                    )
                    if a_result_ta_image.is_ok():
                        ta_image_url = f"{BACKEND_URL}/media/image/{a_result_ta_image.result().public_id}"

                a_result_ta_genres: AResult[List[str]] = (
                    await SpotifyAccess.get_genres_from_artist_async(artist=ta)
                )
                ta_genres: List[str] = (
                    a_result_ta_genres.result() if a_result_ta_genres.is_ok() else []
                )

                track_artist_responses.append(
                    BaseArtistResponse(
                        provider=Spotify.provider_name,
                        publicId=ta.spotify_id,
                        name=ta.name,
                        internalImageUrl=ta_image_url,
                        genres=ta_genres,
                    )
                )

            track_internal_image_url: str = ""
            if track_row.internal_image_id:
                a_result_track_image: AResult[ImageRow] = (
                    await MediaAccess.get_image_from_id_async(
                        id=track_row.internal_image_id
                    )
                )
                if a_result_track_image.is_ok():
                    track_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_track_image.result().public_id}"

            is_downloaded: bool = track_row.path is not None
            audio_src: str | None = None
            if is_downloaded:
                audio_src = f"{BACKEND_URL}/spotify/audio/{track_row.spotify_id}"

            song_responses.append(
                SongResponse(
                    provider=Spotify.provider_name,
                    publicId=core_song.public_id,
                    name=track_row.name,
                    spotifyId=track_row.spotify_id,
                    artists=track_artist_responses,
                    audioSrc=audio_src,
                    downloaded=is_downloaded,
                    internalImageUrl=track_internal_image_url,
                    album=BaseSongAlbumResponse(
                        provider=Spotify.provider_name,
                        publicId=album_row.spotify_id,
                        name=album_row.name,
                        artists=artist_responses,
                        releaseDate=album_row.release_date,
                        internalImageUrl=internal_image_url,
                    ),
                )
            )

        external_image_responses: List[ExternalImageResponse] = [
            ExternalImageResponse(url=img.url, width=img.width, height=img.height)
            for img in external_images
        ]

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=AlbumResponse(
                provider=Spotify.provider_name,
                publicId=core_album.public_id,
                spotifyId=spotify_id,
                name=raw_album.name or "",
                artists=artist_responses,
                songs=song_responses,
                releaseDate=raw_album.release_date or "",
                externalImages=external_image_responses,
                internalImageUrl=internal_image_url,
            ),
        )

    @staticmethod
    async def get_track_async(spotify_id: str) -> AResult[SongResponse]:
        """Get a track by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_track: AResult[TrackRow] = (
            await SpotifyAccess.get_track_spotify_id_async(spotify_id=spotify_id)
        )
        if a_result_track.is_ok():
            track_row: TrackRow = a_result_track.result()

            a_result_core_song: AResult[CoreSongRow] = (
                await MediaAccess.get_song_from_id_async(id=track_row.id)
            )
            if a_result_core_song.is_not_ok():
                logger.error(
                    f"Error getting core song for id {track_row.id}. {a_result_core_song.info()}"
                )
                return AResult(
                    code=a_result_core_song.code(), message=a_result_core_song.message()
                )

            core_song: CoreSongRow = a_result_core_song.result()

            track_artists: List[ArtistRow] = []
            a_result_track_artists: AResult[List[ArtistRow]] = (
                await SpotifyAccess.get_artists_from_track_row_async(
                    track_row=track_row
                )
            )
            if a_result_track_artists.is_ok():
                track_artists = a_result_track_artists.result()

            track_artist_responses: List[BaseArtistResponse] = []
            for ta in track_artists:
                ta_image_url: str = ""
                if ta.internal_image_id:
                    a_result_ta_image: AResult[ImageRow] = (
                        await MediaAccess.get_image_from_id_async(
                            id=ta.internal_image_id
                        )
                    )
                    if a_result_ta_image.is_ok():
                        ta_image_url = f"{BACKEND_URL}/media/image/{a_result_ta_image.result().public_id}"

                a_result_ta_genres: AResult[List[str]] = (
                    await SpotifyAccess.get_genres_from_artist_async(artist=ta)
                )
                ta_genres: List[str] = (
                    a_result_ta_genres.result() if a_result_ta_genres.is_ok() else []
                )

                track_artist_responses.append(
                    BaseArtistResponse(
                        provider=Spotify.provider_name,
                        publicId=ta.spotify_id,
                        name=ta.name,
                        internalImageUrl=ta_image_url,
                        genres=ta_genres,
                    )
                )

            track_internal_image_url: str = ""
            if track_row.internal_image_id:
                a_result_track_image: AResult[ImageRow] = (
                    await MediaAccess.get_image_from_id_async(
                        id=track_row.internal_image_id
                    )
                )
                if a_result_track_image.is_ok():
                    track_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_track_image.result().public_id}"

            is_downloaded: bool = track_row.path is not None
            audio_src: str | None = None
            if is_downloaded:
                audio_src = f"{BACKEND_URL}/spotify/audio/{track_row.spotify_id}"

            album_row: AlbumRow = track_row.album
            album_internal_image_url: str = ""
            if album_row.internal_image_id:
                a_result_album_image: AResult[ImageRow] = (
                    await MediaAccess.get_image_from_id_async(
                        id=album_row.internal_image_id
                    )
                )
                if a_result_album_image.is_ok():
                    album_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_album_image.result().public_id}"

            album_artists: List[ArtistRow] = []
            a_result_album_artists: AResult[List[ArtistRow]] = (
                await SpotifyAccess.get_artists_from_album_id_async(
                    album_id=album_row.id
                )
            )
            if a_result_album_artists.is_ok():
                album_artists = a_result_album_artists.result()

            album_artist_responses: List[BaseArtistResponse] = []
            for aa in album_artists:
                aa_image_url: str = ""
                if aa.internal_image_id:
                    a_result_aa_image: AResult[ImageRow] = (
                        await MediaAccess.get_image_from_id_async(
                            id=aa.internal_image_id
                        )
                    )
                    if a_result_aa_image.is_ok():
                        aa_image_url = f"{BACKEND_URL}/media/image/{a_result_aa_image.result().public_id}"

                a_result_aa_genres: AResult[List[str]] = (
                    await SpotifyAccess.get_genres_from_artist_async(artist=aa)
                )
                aa_genres: List[str] = (
                    a_result_aa_genres.result() if a_result_aa_genres.is_ok() else []
                )

                album_artist_responses.append(
                    BaseArtistResponse(
                        provider=Spotify.provider_name,
                        publicId=aa.spotify_id,
                        name=aa.name,
                        internalImageUrl=aa_image_url,
                        genres=aa_genres,
                    )
                )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=SongResponse(
                    provider=Spotify.provider_name,
                    publicId=core_song.public_id,
                    spotifyId=track_row.spotify_id,
                    name=track_row.name,
                    artists=track_artist_responses,
                    audioSrc=audio_src,
                    downloaded=is_downloaded,
                    internalImageUrl=track_internal_image_url,
                    album=BaseSongAlbumResponse(
                        provider=Spotify.provider_name,
                        publicId=album_row.spotify_id,
                        name=album_row.name,
                        artists=album_artist_responses,
                        releaseDate=album_row.release_date,
                        internalImageUrl=album_internal_image_url,
                    ),
                ),
            )

        if a_result_track.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        # Fetch track from Spotify API.
        a_result_api_tracks: AResult[List[RawSpotifyApiTrack]] = (
            await spotify_api.get_tracks_async([spotify_id])
        )
        if a_result_api_tracks.is_not_ok():
            return AResult(
                code=a_result_api_tracks.code(), message=a_result_api_tracks.message()
            )

        raw_tracks: List[RawSpotifyApiTrack] = a_result_api_tracks.result()
        if not raw_tracks:
            logger.error(f"Track {id} not found on Spotify")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Track not found on Spotify"
            )

        raw_track: RawSpotifyApiTrack = raw_tracks[0]

        # Fetch full album to get all its tracks.
        album_id: str = raw_track.album.id

        a_result_albums: AResult[List[RawSpotifyApiAlbum]] = (
            await spotify_api.get_albums_async([album_id])
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
            await spotify_api.get_tracks_async(album_track_ids)
        )
        raw_album_tracks: List[RawSpotifyApiTrack] = (
            a_result_album_tracks.result() if a_result_album_tracks.is_ok() else []
        )

        # Collect artist IDs from all album tracks and the album itself.
        artist_ids = list(
            {a.id for t in raw_album_tracks for a in (t.artists or []) if a.id}
            | {a.id for album in raw_albums for a in (album.artists or []) if a.id}
        )

        a_result_artists: AResult[List[RawSpotifyApiArtist]] = (
            await spotify_api.get_artists_async(artist_ids)
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

        created_core_song: CoreSongRow | None = None
        provider_id: int = a_result_provider_id.result()
        try:
            async with rockit_db.session_scope_async() as session:
                artist_map: Dict[str, ArtistRow] = {}
                for raw_artist in raw_artists:
                    if not raw_artist.id:
                        continue
                    a = await SpotifyAccess.get_or_create_artist(
                        raw=raw_artist, provider_id=provider_id, session=session
                    )
                    if a.is_ok():
                        artist_map[raw_artist.id] = a.result()

                a_result_album: AResult[AlbumRow] = (
                    await SpotifyAccess.get_or_create_album(
                        raw=raw_album,
                        artist_map=artist_map,
                        session=session,
                        provider_id=provider_id,
                    )
                )
                if a_result_album.is_not_ok():
                    return AResult(
                        code=a_result_album.code(), message=a_result_album.message()
                    )

                album_row: AlbumRow = a_result_album.result()

                for t in raw_album_tracks:
                    a_result_create_track: AResult[Tuple[TrackRow, CoreSongRow]] = (
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

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to populate track in DB: {e}",
            )

        if not created_core_song:
            return AResult(code=AResultCode.GENERAL_ERROR, message=f"core_song is None")

        a_result_fetched_track: AResult[TrackRow] = (
            await SpotifyAccess.get_track_spotify_id_async(spotify_id=spotify_id)
        )
        if a_result_fetched_track.is_not_ok():
            return AResult(
                code=a_result_fetched_track.code(),
                message=a_result_fetched_track.message(),
            )

        fetched_track_row: TrackRow = a_result_fetched_track.result()

        track_artists: List[ArtistRow] = []
        a_result_track_artists: AResult[List[ArtistRow]] = (
            await SpotifyAccess.get_artists_from_track_row_async(
                track_row=fetched_track_row
            )
        )
        if a_result_track_artists.is_ok():
            track_artists = a_result_track_artists.result()

        track_artist_responses: List[BaseArtistResponse] = []
        for ta in track_artists:
            ta_image_url: str = ""
            if ta.internal_image_id:
                a_result_ta_image: AResult[ImageRow] = (
                    await MediaAccess.get_image_from_id_async(id=ta.internal_image_id)
                )
                if a_result_ta_image.is_ok():
                    ta_image_url = f"{BACKEND_URL}/media/image/{a_result_ta_image.result().public_id}"

            a_result_ta_genres: AResult[List[str]] = (
                await SpotifyAccess.get_genres_from_artist_async(artist=ta)
            )
            ta_genres: List[str] = (
                a_result_ta_genres.result() if a_result_ta_genres.is_ok() else []
            )

            track_artist_responses.append(
                BaseArtistResponse(
                    provider=Spotify.provider_name,
                    publicId=ta.spotify_id,
                    name=ta.name,
                    internalImageUrl=ta_image_url,
                    genres=ta_genres,
                )
            )

        track_internal_image_url: str = ""
        if fetched_track_row.internal_image_id:
            a_result_track_image: AResult[ImageRow] = (
                await MediaAccess.get_image_from_id_async(
                    id=fetched_track_row.internal_image_id
                )
            )
            if a_result_track_image.is_ok():
                track_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_track_image.result().public_id}"

        is_downloaded: bool = fetched_track_row.path is not None
        audio_src: str | None = None
        if is_downloaded:
            audio_src = f"{BACKEND_URL}/spotify/audio/{fetched_track_row.spotify_id}"

        fetched_album_row: AlbumRow = fetched_track_row.album
        album_internal_image_url: str = ""
        if fetched_album_row.internal_image_id:
            a_result_album_image: AResult[ImageRow] = (
                await MediaAccess.get_image_from_id_async(
                    id=fetched_album_row.internal_image_id
                )
            )
            if a_result_album_image.is_ok():
                album_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_album_image.result().public_id}"

        fetched_album_artists: List[ArtistRow] = []
        a_result_fetched_album_artists: AResult[List[ArtistRow]] = (
            await SpotifyAccess.get_artists_from_album_id_async(
                album_id=fetched_album_row.id
            )
        )
        if a_result_fetched_album_artists.is_ok():
            fetched_album_artists = a_result_fetched_album_artists.result()

        fetched_album_artist_responses: List[BaseArtistResponse] = []
        for faa in fetched_album_artists:
            faa_image_url: str = ""
            if faa.internal_image_id:
                a_result_faa_image: AResult[ImageRow] = (
                    await MediaAccess.get_image_from_id_async(id=faa.internal_image_id)
                )
                if a_result_faa_image.is_ok():
                    faa_image_url = f"{BACKEND_URL}/media/image/{a_result_faa_image.result().public_id}"

            a_result_faa_genres: AResult[List[str]] = (
                await SpotifyAccess.get_genres_from_artist_async(artist=faa)
            )
            faa_genres: List[str] = (
                a_result_faa_genres.result() if a_result_faa_genres.is_ok() else []
            )

            fetched_album_artist_responses.append(
                BaseArtistResponse(
                    provider=Spotify.provider_name,
                    publicId=faa.spotify_id,
                    name=faa.name,
                    internalImageUrl=faa_image_url,
                    genres=faa_genres,
                )
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=SongResponse(
                provider=Spotify.provider_name,
                publicId=created_core_song.public_id,
                spotifyId=spotify_id,
                name=raw_track.name,
                artists=track_artist_responses,
                audioSrc=audio_src,
                downloaded=is_downloaded,
                internalImageUrl=track_internal_image_url,
                album=BaseSongAlbumResponse(
                    provider=Spotify.provider_name,
                    publicId=fetched_album_row.spotify_id,
                    name=fetched_album_row.name,
                    artists=fetched_album_artist_responses,
                    releaseDate=fetched_album_row.release_date,
                    internalImageUrl=album_internal_image_url,
                ),
            ),
        )

    @staticmethod
    async def get_artist_async(spotify_id: str) -> AResult[BaseArtistResponse]:
        """Get an artist by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        a_result_artist: AResult[ArtistRow] = (
            await SpotifyAccess.get_artist_public_id_async(spotify_id=spotify_id)
        )
        if a_result_artist.is_ok():
            artist_row = a_result_artist.result()

            artist_internal_image_url: str = ""
            if artist_row.internal_image_id:
                a_result_artist_image: AResult[ImageRow] = (
                    await MediaAccess.get_image_from_id_async(
                        id=artist_row.internal_image_id
                    )
                )
                if a_result_artist_image.is_ok():
                    artist_internal_image_url = f"{BACKEND_URL}/media/image/{a_result_artist_image.result().public_id}"

            a_result_genres: AResult[List[str]] = (
                await SpotifyAccess.get_genres_from_artist_async(artist=artist_row)
            )
            genres: List[str] = (
                a_result_genres.result() if a_result_genres.is_ok() else []
            )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=BaseArtistResponse(
                    publicId=spotify_id,
                    provider=Spotify.provider_name,
                    name=artist_row.name,
                    internalImageUrl=artist_internal_image_url,
                    genres=genres,
                ),
            )
        if a_result_artist.code() != AResultCode.NOT_FOUND:
            return AResult(
                code=a_result_artist.code(), message=a_result_artist.message()
            )

        # Fetch from Spotify API.
        a_result_api_artists: AResult[List[RawSpotifyApiArtist]] = (
            await spotify_api.get_artists_async([spotify_id])
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

        provider_id = a_result_provider_id.result()

        try:
            async with rockit_db.session_scope_async() as session:
                a = await SpotifyAccess.get_or_create_artist(
                    raw=raw_artist, provider_id=provider_id, session=session
                )
                if a.is_not_ok():
                    return AResult(code=a.code(), message=a.message())

                # created_artist = a.result()

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to populate artist in DB: {e}",
            )

        a_result_fetched_artist: AResult[ArtistRow] = (
            await SpotifyAccess.get_artist_public_id_async(spotify_id=spotify_id)
        )
        if a_result_fetched_artist.is_not_ok():
            return AResult(
                code=a_result_fetched_artist.code(),
                message=a_result_fetched_artist.message(),
            )

        fetched_artist: ArtistRow = a_result_fetched_artist.result()

        fetched_artist_image_url: str = ""
        if fetched_artist.internal_image_id:
            a_result_fetched_image: AResult[ImageRow] = (
                await MediaAccess.get_image_from_id_async(
                    id=fetched_artist.internal_image_id
                )
            )
            if a_result_fetched_image.is_ok():
                fetched_artist_image_url = f"{BACKEND_URL}/media/image/{a_result_fetched_image.result().public_id}"

        a_result_fetched_genres: AResult[List[str]] = (
            await SpotifyAccess.get_genres_from_artist_async(artist=fetched_artist)
        )
        fetched_genres: List[str] = (
            a_result_fetched_genres.result() if a_result_fetched_genres.is_ok() else []
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BaseArtistResponse(
                publicId=spotify_id,
                provider=Spotify.provider_name,
                name=raw_artist.name or "",
                internalImageUrl=fetched_artist_image_url,
                genres=fetched_genres,
            ),
        )

    @staticmethod
    async def get_playlist_async(spotify_id: str) -> AResult[BasePlaylistResponse]:
        """Get a playlist by ID, fetching from Spotify API and populating the database if not found."""

        # Check DB.
        from backend.spotify.access.db.ormModels.playlist import SpotifyPlaylistRow

        a_result_playlist: AResult[SpotifyPlaylistRow] = (
            await SpotifyAccess.get_playlist_public_id_async(spotify_id=spotify_id)
        )
        if a_result_playlist.is_ok():
            playlist_row: SpotifyPlaylistRow = a_result_playlist.result()
            logger.critical("TODO")
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=BasePlaylistResponse(
                    provider=Spotify.provider_name,
                    publicId=spotify_id,
                    name=playlist_row.name,
                ),
            )
        if a_result_playlist.code() != AResultCode.NOT_FOUND:
            return AResult(
                code=a_result_playlist.code(), message=a_result_playlist.message()
            )

        # Fetch playlist from Spotify API.
        a_result_api_playlist: AResult[RawSpotifyApiPlaylist] = (
            await spotify_api.get_playlist_async(spotify_id)
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

        album_ids = list(album_ids_set)

        # Fetch full albums (cache-first).
        a_result_albums: AResult[List[RawSpotifyApiAlbum]] = (
            await spotify_api.get_albums_async(album_ids)
        )
        raw_albums: List[RawSpotifyApiAlbum] = (
            a_result_albums.result() if a_result_albums.is_ok() else []
        )

        # Collect all artist IDs from tracks and albums.
        artist_ids = list(
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
            await spotify_api.get_artists_async(artist_ids)
        )
        raw_artists = a_result_artists.result() if a_result_artists.is_ok() else []

        # Fetch full tracks (for ISRC).
        a_result_full_tracks: AResult[List[RawSpotifyApiTrack]] = (
            await spotify_api.get_tracks_async(track_ids)
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

        provider_id = a_result_provider_id.result()
        try:
            async with rockit_db.session_scope_async() as session:
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
                    a_result_album: AResult[AlbumRow] = (
                        await SpotifyAccess.get_or_create_album(
                            raw=raw_album,
                            artist_map=artist_map,
                            session=session,
                            provider_id=provider_id,
                        )
                    )
                    if a_result_album.is_ok():
                        album_row_map[raw_album.id] = a_result_album.result()

                track_row_map: Dict[str, TrackRow] = {}
                for track_id in track_ids:
                    raw_track: RawSpotifyApiTrack | None = full_track_map.get(track_id)
                    if not raw_track or not raw_track.id:
                        continue
                    album_id: str = raw_track.album.id
                    album_row: AlbumRow = album_row_map.get(album_id)
                    if album_row is None:
                        continue
                    a_result_track: AResult[Tuple[TrackRow, CoreSongRow]] = (
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

        except Exception as e:
            logger.error(f"Failed to populate playlist in DB: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to populate playlist in DB: {e}",
            )

        logger.critical("TODO")
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BasePlaylistResponse(
                provider=Spotify.provider_name,
                publicId=spotify_id,
                name=raw_playlist.name,
            ),
        )
