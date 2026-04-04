from typing import List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.constants import BACKEND_URL

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.mediaAccess import MediaAccess

from backend.core.framework.media.image import Image

from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.basePlaylistResponse import (
    BasePlaylistResponse,
    PlaylistResponseItem,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)

from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.spotify.access.db.ormModels.artist import ArtistRow
from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow
from backend.spotify.access.db.ormModels.playlist import PlaylistRow
from backend.spotify.access.db.ormModels.playlist_tracks import PlaylistTrackRow
from backend.spotify.access.db.ormModels.track import TrackRow
from backend.spotify.access.spotifyAccess import SpotifyAccess
from backend.spotify.responses.albumResponse import SpotifyAlbumResponse
from backend.spotify.responses.artistResponse import SpotifyArtistResponse
from backend.spotify.responses.externalImageResponse import SpotifyExternalImageResponse
from backend.spotify.responses.songResponse import SpotifyTrackResponse

logger = getLogger(__name__)


async def get_artist_response_async(
    session: AsyncSession,
    provider_name: str,
    artist_row: ArtistRow,
) -> AResult[SpotifyArtistResponse]:
    """Convert an ArtistRow to a SpotifyArtistResponse including genres."""

    a_result_genres: AResult[List[str]] = (
        await SpotifyAccess.get_genres_from_artist_async(
            session=session, artist=artist_row
        )
    )
    genres: List[str] = a_result_genres.result() if a_result_genres.is_ok() else []

    public_id: str = artist_row.core_artist.public_id

    return AResult(
        code=AResultCode.OK,
        message="OK",
        result=SpotifyArtistResponse(
            provider=provider_name,
            publicId=public_id,
            url=f"/artist/{public_id}",
            name=artist_row.name,
            imageUrl=Image.get_internal_image_url(image=artist_row.image),
            genres=genres,
        ),
    )


def get_album_without_songs_response(
    provider_name: str,
    album_row: AlbumRow,
) -> BaseAlbumWithoutSongsResponse:
    """Convert an AlbumRow to a BaseAlbumWithoutSongsResponse (no songs included)."""

    public_id: str = album_row.core_album.public_id

    artist_responses: List[BaseArtistResponse] = [
        BaseArtistResponse(
            provider=provider_name,
            publicId=a.core_artist.public_id,
            url=f"/artist/{a.core_artist.public_id}",
            name=a.name,
            imageUrl=Image.get_internal_image_url(image=a.image),
        )
        for a in album_row.artists
    ]

    return BaseAlbumWithoutSongsResponse(
        provider=provider_name,
        publicId=public_id,
        url=f"/album/{public_id}",
        name=album_row.name,
        imageUrl=Image.get_internal_image_url(image=album_row.image),
        artists=artist_responses,
        releaseDate=album_row.release_date,
    )


async def get_track_response_async(
    session: AsyncSession,
    provider_name: str,
    track_row: TrackRow,
) -> AResult[SpotifyTrackResponse]:
    """Convert a TrackRow to a SpotifyTrackResponse including artists and album."""

    a_result_artists: AResult[List[ArtistRow]] = (
        await SpotifyAccess.get_artists_from_track_row_async(
            session=session, track_row=track_row
        )
    )
    if a_result_artists.is_not_ok():
        logger.error(
            f"Error getting artists for track {track_row.spotify_id}. {a_result_artists.info()}"
        )
        return AResult(code=a_result_artists.code(), message=a_result_artists.message())

    artist_responses: List[SpotifyArtistResponse] = []
    for artist_row in a_result_artists.result():
        a_result_artist: AResult[SpotifyArtistResponse] = (
            await get_artist_response_async(
                session=session, provider_name=provider_name, artist_row=artist_row
            )
        )
        if a_result_artist.is_ok():
            artist_responses.append(a_result_artist.result())

    is_downloaded: bool = track_row.path is not None
    audio_src: str | None = None
    if is_downloaded:
        audio_src = f"{BACKEND_URL}/spotify/audio/{track_row.spotify_id}"

    public_id: str = track_row.core_song.public_id

    return AResult(
        code=AResultCode.OK,
        message="OK",
        result=SpotifyTrackResponse(
            provider=provider_name,
            publicId=public_id,
            url=f"/song/{public_id}",
            name=track_row.name,
            spotifyId=track_row.spotify_id,
            artists=artist_responses,
            audioSrc=audio_src,
            downloaded=is_downloaded,
            imageUrl=Image.get_internal_image_url(image=track_row.image),
            duration_ms=track_row.duration_ms,
            discNumber=track_row.disc_number,
            trackNumber=track_row.track_number,
            album=get_album_without_songs_response(
                provider_name=provider_name, album_row=track_row.album
            ),
        ),
    )


async def get_album_with_songs_response_async(
    session: AsyncSession,
    provider_name: str,
    album_row: AlbumRow,
) -> AResult[SpotifyAlbumResponse]:
    """Convert an AlbumRow to a SpotifyAlbumResponse with all songs and external images."""

    a_result_tracks: AResult[List[Tuple[TrackRow, CoreMediaRow]]] = (
        await SpotifyAccess.get_tracks_with_core_song_from_album_async(
            session=session, album_id=album_row.id
        )
    )
    tracks_with_core: List[Tuple[TrackRow, CoreMediaRow]] = (
        a_result_tracks.result() if a_result_tracks.is_ok() else []
    )

    a_result_external_images: AResult[List[ExternalImageRow]] = (
        await SpotifyAccess.get_external_images_from_album_id_async(
            session=session, album_id=album_row.id
        )
    )
    external_images: List[ExternalImageRow] = (
        a_result_external_images.result() if a_result_external_images.is_ok() else []
    )

    album_artist_responses: List[BaseArtistResponse] = [
        BaseArtistResponse(
            provider=provider_name,
            publicId=a.core_artist.public_id,
            url=f"/artist/{a.core_artist.public_id}",
            name=a.name,
            imageUrl=Image.get_internal_image_url(image=a.image),
        )
        for a in album_row.artists
    ]

    song_responses: List[BaseSongWithoutAlbumResponse] = []
    for track_row, _ in tracks_with_core:
        a_result_track_artists: AResult[List[ArtistRow]] = (
            await SpotifyAccess.get_artists_from_track_row_async(
                session=session, track_row=track_row
            )
        )

        track_artist_responses: List[SpotifyArtistResponse] = []
        if a_result_track_artists.is_ok():
            for artist_row in a_result_track_artists.result():
                a_result_artist: AResult[SpotifyArtistResponse] = (
                    await get_artist_response_async(
                        session=session,
                        provider_name=provider_name,
                        artist_row=artist_row,
                    )
                )
                if a_result_artist.is_ok():
                    track_artist_responses.append(a_result_artist.result())

        is_downloaded: bool = track_row.path is not None
        audio_src: str | None = None
        if is_downloaded:
            audio_src = f"{BACKEND_URL}/spotify/audio/{track_row.spotify_id}"

        track_public_id: str = track_row.core_song.public_id

        song_responses.append(
            BaseSongWithoutAlbumResponse(
                provider=provider_name,
                publicId=track_public_id,
                url=f"/song/{track_public_id}",
                name=track_row.name,
                artists=track_artist_responses,
                audioSrc=audio_src,
                downloaded=is_downloaded,
                imageUrl=Image.get_internal_image_url(image=track_row.image),
                duration_ms=track_row.duration_ms,
                discNumber=track_row.disc_number,
                trackNumber=track_row.track_number,
            )
        )

    external_image_responses: List[SpotifyExternalImageResponse] = [
        SpotifyExternalImageResponse(url=img.url, width=img.width, height=img.height)
        for img in external_images
    ]

    public_id: str = album_row.core_album.public_id

    return AResult(
        code=AResultCode.OK,
        message="OK",
        result=SpotifyAlbumResponse(
            provider=provider_name,
            publicId=public_id,
            url=f"/album/{public_id}",
            name=album_row.name,
            imageUrl=Image.get_internal_image_url(image=album_row.image),
            artists=album_artist_responses,
            releaseDate=album_row.release_date,
            spotifyId=album_row.spotify_id,
            externalImages=external_image_responses,
            songs=song_responses,
        ),
    )


async def get_playlist_response_async(
    session: AsyncSession,
    provider_name: str,
    playlist_row: PlaylistRow,
) -> AResult[BasePlaylistResponse]:
    """Convert a PlaylistRow to a BasePlaylistResponse with all songs."""

    a_result_track_links: AResult[List[Tuple[PlaylistTrackRow, TrackRow]]] = (
        await SpotifyAccess.get_playlist_track_links_async(
            session=session, playlist_id=playlist_row.id
        )
    )
    playlist_track_links: List[Tuple[PlaylistTrackRow, TrackRow]] = (
        a_result_track_links.result() if a_result_track_links.is_ok() else []
    )

    song_responses: List[PlaylistResponseItem[BaseSongWithAlbumResponse]] = []
    for playlist_track_row, track_row in playlist_track_links:
        a_result_track: AResult[SpotifyTrackResponse] = await get_track_response_async(
            session=session, provider_name=provider_name, track_row=track_row
        )
        if a_result_track.is_not_ok():
            logger.error(
                f"Error converting track {track_row.spotify_id}. {a_result_track.info()}"
            )
            continue

        track_response: SpotifyTrackResponse = a_result_track.result()

        song_responses.append(
            PlaylistResponseItem(
                item=BaseSongWithAlbumResponse(
                    provider=track_response.provider,
                    publicId=track_response.publicId,
                    url=track_response.url,
                    name=track_response.name,
                    artists=list(track_response.artists),
                    audioSrc=track_response.audioSrc,
                    downloaded=track_response.downloaded,
                    imageUrl=track_response.imageUrl,
                    duration_ms=track_response.duration_ms,
                    discNumber=track_response.discNumber,
                    trackNumber=track_response.trackNumber,
                    album=track_response.album,
                ),
                addedAt=playlist_track_row.added_at,
            )
        )

    a_result_core_playlist: AResult[CoreMediaRow] = (
        await MediaAccess.get_media_from_id_async(session=session, id=playlist_row.id)
    )
    if a_result_core_playlist.is_not_ok():
        logger.error(
            f"Error getting core media for playlist {playlist_row.id}. {a_result_core_playlist.info()}"
        )
        return AResult(
            code=a_result_core_playlist.code(), message=a_result_core_playlist.message()
        )

    public_id: str = a_result_core_playlist.result().public_id

    return AResult(
        code=AResultCode.OK,
        message="OK",
        result=BasePlaylistResponse(
            type="playlist",
            description=playlist_row.description or "",
            provider=provider_name,
            publicId=public_id,
            url=f"/playlist/{public_id}",
            name=playlist_row.name,
            medias=song_responses,
            contributors=[],
            imageUrl=Image.get_internal_image_url(image=playlist_row.image),
            owner=playlist_row.owner,
        ),
    )
