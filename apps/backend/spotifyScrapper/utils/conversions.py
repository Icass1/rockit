from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from constants import BACKEND_URL
from core.access.db.ormModels.media import CoreMediaRow
from core.access.mediaAccess import MediaAccess
from core.framework.media.image import Image
from core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
    PlaylistResponseItem,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)
from core.utils.timeIt import time_it
from logger import getLogger
from result import Result, ResultCode
from spotifyScrapper.access.db.associationTables.album_external_images import (
    album_external_images,
)
from spotifyScrapper.access.db.associationTables.artist_genres import (
    artist_genres,
)
from spotifyScrapper.access.db.associationTables.song_artists import (
    song_artists,
)
from spotifyScrapper.access.db.ormModels.album import AlbumRow
from spotifyScrapper.access.db.ormModels.artist import ArtistRow
from spotifyScrapper.access.db.ormModels.externalImage import ExternalImageRow
from spotifyScrapper.access.db.ormModels.genre import GenreRow
from spotifyScrapper.access.db.ormModels.playlist import PlaylistRow
from spotifyScrapper.access.db.ormModels.track import TrackRow
from spotifyScrapper.access.spotifyScrapperAccess import SpotifyScrapperAccess
from spotifyScrapper.framework.models.playlistTrackLink import (
    PlaylistTrackLink,
)
from spotifyScrapper.framework.models.trackWithCoreMedia import (
    TrackWithCoreMedia,
)
from spotifyScrapper.responses.albumResponse import (
    SpotifyScrapperAlbumResponse,
)
from spotifyScrapper.responses.artistResponse import (
    SpotifyScrapperArtistResponse,
)
from spotifyScrapper.responses.externalImageResponse import (
    SpotifyScrapperExternalImageResponse,
)
from spotifyScrapper.responses.songResponse import SpotifyScrapperTrackResponse

logger = getLogger(__name__)


async def get_artist_response_async(
    session: AsyncSession,
    provider_name: str,
    artist_row: ArtistRow,
) -> Result[SpotifyScrapperArtistResponse]:
    a_result_genres: Result[list[str]] = await SpotifyScrapperAccess.get_genres_from_artist_async(
        session=session, artist=artist_row
    )
    genres: list[str] = a_result_genres.result() if a_result_genres.is_ok() else []

    public_id: str = artist_row.core_artist.public_id

    a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
        image=artist_row.image
    )
    if a_result_image_url.is_not_ok():
        logger.error(f"Error getting artist image URL. {a_result_image_url.info()}")
        return Result[SpotifyScrapperArtistResponse].from_result(a_result_image_url)

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=SpotifyScrapperArtistResponse(
            provider=provider_name,
            publicId=public_id,
            url=f"/artist/{public_id}",
            providerUrl=f"https://open.spotify.com/artist/{artist_row.spotify_id}",
            name=artist_row.name,
            imageUrl=a_result_image_url.result(),
            dominantColor=artist_row.image.dominant_color,
            genres=genres,
        ),
    )


async def get_album_without_songs_response_async(
    provider_name: str,
    album_row: AlbumRow,
    artist_rows: list[ArtistRow],
) -> Result[BaseAlbumWithoutSongsResponse]:
    public_id: str = album_row.core_album.public_id

    artist_responses: list[BaseArtistResponse] = []
    for a in artist_rows:
        a_result_artist_image_url: Result[str] = await Image.get_internal_image_url_async(
            image=a.image
        )
        if a_result_artist_image_url.is_not_ok():
            logger.error(
                f"Error getting album artist image URL. {a_result_artist_image_url.info()}"
            )
            return Result[BaseAlbumWithoutSongsResponse].from_result(a_result_artist_image_url)

        artist_responses.append(
            BaseArtistResponse(
                provider=provider_name,
                publicId=a.core_artist.public_id,
                url=f"/artist/{a.core_artist.public_id}",
                providerUrl=f"https://open.spotify.com/artist/{a.spotify_id}",
                name=a.name,
                imageUrl=a_result_artist_image_url.result(),
                dominantColor=a.image.dominant_color,
            )
        )

    a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
        image=album_row.image
    )
    if a_result_image_url.is_not_ok():
        logger.error(f"Error getting album image URL. {a_result_image_url.info()}")
        return Result[BaseAlbumWithoutSongsResponse].from_result(a_result_image_url)

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=BaseAlbumWithoutSongsResponse(
            provider=provider_name,
            publicId=public_id,
            url=f"/album/{public_id}",
            providerUrl=f"https://open.spotify.com/album/{album_row.spotify_id}",
            name=album_row.name,
            imageUrl=a_result_image_url.result(),
            dominantColor=album_row.image.dominant_color,
            artists=artist_responses,
            releaseDate=album_row.release_date,
        ),
    )


async def get_track_response_async(
    session: AsyncSession,
    provider_name: str,
    track_row: TrackRow,
) -> Result[SpotifyScrapperTrackResponse]:
    a_result_artists: Result[
        list[ArtistRow]
    ] = await SpotifyScrapperAccess.get_artists_from_track_row_async(
        session=session, track_row=track_row
    )
    if a_result_artists.is_not_ok():
        logger.error(
            f"Error getting artists for track {track_row.spotify_id}. {a_result_artists.info()}"
        )
        return Result(code=a_result_artists.code(), message=a_result_artists.message())

    artist_responses: list[SpotifyScrapperArtistResponse] = []
    for artist_row in a_result_artists.result():
        a_result_artist: Result[SpotifyScrapperArtistResponse] = await get_artist_response_async(
            session=session, provider_name=provider_name, artist_row=artist_row
        )
        if a_result_artist.is_ok():
            artist_responses.append(a_result_artist.result())

    is_downloaded: bool = track_row.path is not None
    audio_src: str | None = None
    if is_downloaded:
        audio_src = f"{BACKEND_URL}/spotify_scrapper/audio/{track_row.spotify_id}"

    public_id: str = track_row.core_song.public_id

    a_result_album_artists: Result[
        list[ArtistRow]
    ] = await SpotifyScrapperAccess.get_artists_from_album_id_async(
        session=session, album_id=track_row.album_id
    )
    album_artists: list[ArtistRow] = (
        a_result_album_artists.result() if a_result_album_artists.is_ok() else []
    )

    a_result_album: Result[
        BaseAlbumWithoutSongsResponse
    ] = await get_album_without_songs_response_async(
        provider_name=provider_name,
        album_row=track_row.album,
        artist_rows=album_artists,
    )
    if a_result_album.is_not_ok():
        logger.error(
            f"Error building album response for track {track_row.spotify_id}. "
            f"{a_result_album.info()}"
        )
        return Result[SpotifyScrapperTrackResponse].from_result(a_result_album)

    a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
        image=track_row.album.image
    )
    if a_result_image_url.is_not_ok():
        logger.error(f"Error getting track image URL. {a_result_image_url.info()}")
        return Result[SpotifyScrapperTrackResponse].from_result(a_result_image_url)

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=SpotifyScrapperTrackResponse(
            provider=provider_name,
            publicId=public_id,
            providerUrl=f"https://open.spotify.com/track/{track_row.spotify_id}",
            name=track_row.name,
            spotifyId=track_row.spotify_id,
            artists=artist_responses,
            audioUrl=audio_src,
            downloaded=is_downloaded,
            imageUrl=a_result_image_url.result(),
            dominantColor=track_row.album.image.dominant_color,
            duration_ms=track_row.duration_ms,
            discNumber=track_row.disc_number,
            trackNumber=track_row.track_number,
            album=a_result_album.result(),
        ),
    )


@time_it
async def get_album_with_songs_response_async(
    session: AsyncSession,
    provider_name: str,
    album_row: AlbumRow,
) -> Result[SpotifyScrapperAlbumResponse]:
    a_result_tracks: Result[
        list[TrackWithCoreMedia]
    ] = await SpotifyScrapperAccess.get_tracks_with_core_song_from_album_async(
        session=session, album_id=album_row.id
    )
    tracks_with_core: list[TrackWithCoreMedia] = (
        a_result_tracks.result() if a_result_tracks.is_ok() else []
    )

    a_result_external_images: Result[
        list[ExternalImageRow]
    ] = await SpotifyScrapperAccess.get_external_images_from_album_id_async(
        session=session, album_id=album_row.id
    )
    external_images: list[ExternalImageRow] = (
        a_result_external_images.result() if a_result_external_images.is_ok() else []
    )

    a_result_album_artists: Result[
        list[ArtistRow]
    ] = await SpotifyScrapperAccess.get_artists_from_album_id_async(
        session=session, album_id=album_row.id
    )
    album_artists: list[ArtistRow] = (
        a_result_album_artists.result() if a_result_album_artists.is_ok() else []
    )

    album_artist_responses: list[BaseArtistResponse] = []
    for a in album_artists:
        a_result_album_artist_image_url: Result[str] = await Image.get_internal_image_url_async(
            image=a.image
        )
        if a_result_album_artist_image_url.is_not_ok():
            logger.error(
                f"Error getting album artist image URL. {a_result_album_artist_image_url.info()}"
            )
            return Result[SpotifyScrapperAlbumResponse].from_result(a_result_album_artist_image_url)

        album_artist_responses.append(
            BaseArtistResponse(
                provider=provider_name,
                publicId=a.core_artist.public_id,
                url=f"/artist/{a.core_artist.public_id}",
                providerUrl=f"https://open.spotify.com/artist/{a.spotify_id}",
                name=a.name,
                imageUrl=a_result_album_artist_image_url.result(),
                dominantColor=a.image.dominant_color,
            )
        )

    song_responses: list[BaseSongWithoutAlbumResponse] = []
    for twc in tracks_with_core:
        track_row = twc.track
        a_result_track_artists: Result[
            list[ArtistRow]
        ] = await SpotifyScrapperAccess.get_artists_from_track_row_async(
            session=session, track_row=track_row
        )

        track_artist_responses: list[SpotifyScrapperArtistResponse] = []
        if a_result_track_artists.is_ok():
            for artist_row in a_result_track_artists.result():
                a_result_artist: Result[
                    SpotifyScrapperArtistResponse
                ] = await get_artist_response_async(
                    session=session,
                    provider_name=provider_name,
                    artist_row=artist_row,
                )
                if a_result_artist.is_ok():
                    track_artist_responses.append(a_result_artist.result())

        is_downloaded: bool = track_row.path is not None
        audio_src: str | None = None
        if is_downloaded:
            audio_src = f"{BACKEND_URL}/spotify_scrapper/audio/{track_row.spotify_id}"

        track_public_id: str = track_row.core_song.public_id

        a_result_track_image_url: Result[str] = await Image.get_internal_image_url_async(
            image=album_row.image
        )
        if a_result_track_image_url.is_not_ok():
            logger.error(f"Error getting track image URL. {a_result_track_image_url.info()}")
            return Result[SpotifyScrapperAlbumResponse].from_result(a_result_track_image_url)

        song_responses.append(
            BaseSongWithoutAlbumResponse(
                provider=provider_name,
                publicId=track_public_id,
                providerUrl=f"https://open.spotify.com/track/{track_row.spotify_id}",
                name=track_row.name,
                artists=track_artist_responses,
                audioUrl=audio_src,
                downloaded=is_downloaded,
                imageUrl=a_result_track_image_url.result(),
                dominantColor=album_row.image.dominant_color,
                duration_ms=track_row.duration_ms,
                discNumber=track_row.disc_number,
                trackNumber=track_row.track_number,
            )
        )

    external_image_responses: list[SpotifyScrapperExternalImageResponse] = [
        SpotifyScrapperExternalImageResponse(url=img.url, width=img.width, height=img.height)
        for img in external_images
    ]

    public_id: str = album_row.core_album.public_id

    a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
        image=album_row.image
    )
    if a_result_image_url.is_not_ok():
        logger.error(f"Error getting album image URL. {a_result_image_url.info()}")
        return Result[SpotifyScrapperAlbumResponse].from_result(a_result_image_url)

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=SpotifyScrapperAlbumResponse(
            provider=provider_name,
            publicId=public_id,
            url=f"/album/{public_id}",
            providerUrl=f"https://open.spotify.com/album/{album_row.spotify_id}",
            name=album_row.name,
            imageUrl=a_result_image_url.result(),
            dominantColor=album_row.image.dominant_color,
            artists=album_artist_responses,
            releaseDate=album_row.release_date,
            spotifyId=album_row.spotify_id,
            externalImages=external_image_responses,
            songs=song_responses,
        ),
    )


async def get_playlist_without_medias_response_async(
    session: AsyncSession,
    provider_name: str,
    playlist_row: PlaylistRow,
) -> Result[BasePlaylistWithoutMediasResponse]:
    a_result_core_playlist: Result[CoreMediaRow] = await MediaAccess.get_media_from_id_async(
        session=session, id=playlist_row.id
    )
    if a_result_core_playlist.is_not_ok():
        logger.error(
            f"Error getting core media for playlist {playlist_row.id}. "
            f"{a_result_core_playlist.info()}"
        )
        return Result(code=a_result_core_playlist.code(), message=a_result_core_playlist.message())

    public_id: str = a_result_core_playlist.result().public_id

    a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
        image=playlist_row.image
    )
    if a_result_image_url.is_not_ok():
        logger.error(f"Error getting playlist image URL. {a_result_image_url.info()}")
        return Result[BasePlaylistWithoutMediasResponse].from_result(a_result_image_url)

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=BasePlaylistWithoutMediasResponse(
            type="playlist",
            description=playlist_row.description or "",
            provider=provider_name,
            publicId=public_id,
            url=f"/playlist/{public_id}",
            providerUrl=f"https://open.spotify.com/playlist/{playlist_row.spotify_id}",
            name=playlist_row.name,
            contributors=[],
            imageUrl=a_result_image_url.result(),
            owner=BaseArtistResponse(
                provider=provider_name,
                publicId="",
                url="",
                providerUrl="",
                name=playlist_row.owner,
                imageUrl="",
                dominantColor="",
            ),
        ),
    )


async def get_playlist_with_medias_response_async(
    session: AsyncSession,
    provider_name: str,
    playlist_row: PlaylistRow,
) -> Result[BasePlaylistWithMediasResponse]:
    a_result_track_links: Result[
        list[PlaylistTrackLink]
    ] = await SpotifyScrapperAccess.get_playlist_track_links_async(
        session=session, playlist_id=playlist_row.id
    )
    playlist_track_links: list[PlaylistTrackLink] = (
        a_result_track_links.result() if a_result_track_links.is_ok() else []
    )

    song_responses: list[PlaylistResponseItem[BaseSongWithAlbumResponse]] = []
    for ptl in playlist_track_links:
        track_row = ptl.track
        playlist_track_row = ptl.playlist_track
        a_result_track: Result[SpotifyScrapperTrackResponse] = await get_track_response_async(
            session=session, provider_name=provider_name, track_row=track_row
        )
        if a_result_track.is_not_ok():
            logger.error(f"Error converting track {track_row.spotify_id}. {a_result_track.info()}")
            continue

        track_response: SpotifyScrapperTrackResponse = a_result_track.result()

        song_responses.append(
            PlaylistResponseItem(
                item=BaseSongWithAlbumResponse(
                    provider=track_response.provider,
                    publicId=track_response.publicId,
                    providerUrl=track_response.providerUrl,
                    name=track_response.name,
                    artists=list(track_response.artists),
                    audioUrl=track_response.audioUrl,
                    downloaded=track_response.downloaded,
                    imageUrl=track_response.imageUrl,
                    dominantColor="",
                    duration_ms=track_response.duration_ms,
                    discNumber=track_response.discNumber,
                    trackNumber=track_response.trackNumber,
                    album=track_response.album,
                ),
                addedAt=playlist_track_row.added_at,
            )
        )

    a_result_core_playlist: Result[CoreMediaRow] = await MediaAccess.get_media_from_id_async(
        session=session, id=playlist_row.id
    )
    if a_result_core_playlist.is_not_ok():
        logger.error(
            f"Error getting core media for playlist {playlist_row.id}. "
            f"{a_result_core_playlist.info()}"
        )
        return Result(code=a_result_core_playlist.code(), message=a_result_core_playlist.message())

    public_id: str = a_result_core_playlist.result().public_id

    a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
        image=playlist_row.image
    )
    if a_result_image_url.is_not_ok():
        logger.error(f"Error getting playlist image URL. {a_result_image_url.info()}")
        return Result[BasePlaylistWithMediasResponse].from_result(a_result_image_url)

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=BasePlaylistWithMediasResponse(
            type="playlist",
            description=playlist_row.description or "",
            provider=provider_name,
            publicId=public_id,
            url=f"/playlist/{public_id}",
            providerUrl=f"https://open.spotify.com/playlist/{playlist_row.spotify_id}",
            name=playlist_row.name,
            medias=song_responses,
            contributors=[],
            imageUrl=a_result_image_url.result(),
            owner=BaseArtistResponse(
                provider=provider_name,
                publicId="",
                url="",
                providerUrl="",
                name=playlist_row.owner,
                imageUrl="",
                dominantColor="",
            ),
        ),
    )


@time_it
async def get_tracks_responses_async(
    session: AsyncSession,
    provider_name: str,
    track_rows: list[TrackRow],
) -> Result[list[SpotifyScrapperTrackResponse]]:
    if not track_rows:
        return Result(code=ResultCode.OK, message="OK", result=[])

    try:
        track_ids = [t.id for t in track_rows]

        album_ids = list({t.album_id for t in track_rows})
        album_by_id: dict[int, AlbumRow] = {}
        if album_ids:
            album_result = await session.execute(
                select(AlbumRow)
                .where(AlbumRow.id.in_(album_ids))
                .options(
                    selectinload(AlbumRow.artists),
                )
            )
            for a in album_result.scalars().all():
                album_by_id[a.id] = a

        artist_by_id: dict[int, ArtistRow] = {}
        track_artist_map: dict[int, list[ArtistRow]] = defaultdict(list)
        if track_ids:
            link_result = await session.execute(
                select(song_artists.c.track_id, song_artists.c.artist_id).where(
                    song_artists.c.track_id.in_(track_ids)
                )
            )
            artist_links = list(link_result.all())
            all_artist_ids = list({row.artist_id for row in artist_links})

            if all_artist_ids:
                artist_result = await session.execute(
                    select(ArtistRow).where(ArtistRow.id.in_(all_artist_ids))
                )
                for artist in artist_result.scalars().all():
                    artist_by_id[artist.id] = artist

            for row in artist_links:
                artist = artist_by_id.get(row.artist_id)
                if artist:
                    track_artist_map[row.track_id].append(artist)

        artist_genre_map: dict[int, list[str]] = defaultdict(list)
        if artist_by_id:
            genre_result = await session.execute(
                select(artist_genres.c.artist_id, GenreRow.name)
                .join(GenreRow, GenreRow.id == artist_genres.c.genre_id)
                .where(artist_genres.c.artist_id.in_(list(artist_by_id.keys())))
            )
            for row in genre_result.all():
                artist_genre_map[row.artist_id].append(row.name)

        responses: list[SpotifyScrapperTrackResponse] = []
        for track_row in track_rows:
            album_row = album_by_id.get(track_row.album_id)
            if not album_row:
                continue

            track_artists = track_artist_map.get(track_row.id, [])
            track_artist_responses: list[SpotifyScrapperArtistResponse] = []
            for a in track_artists:
                a_result_artist_image_url: Result[str] = await Image.get_internal_image_url_async(
                    image=a.image
                )
                if a_result_artist_image_url.is_not_ok():
                    logger.error(
                        f"Error getting artist image URL. {a_result_artist_image_url.info()}"
                    )
                    return Result[list[SpotifyScrapperTrackResponse]].from_result(
                        a_result_artist_image_url
                    )

                track_artist_responses.append(
                    SpotifyScrapperArtistResponse(
                        provider=provider_name,
                        publicId=a.core_artist.public_id,
                        url=f"/artist/{a.core_artist.public_id}",
                        providerUrl=f"https://open.spotify.com/artist/{a.spotify_id}",
                        name=a.name,
                        imageUrl=a_result_artist_image_url.result(),
                        dominantColor=a.image.dominant_color,
                        genres=artist_genre_map.get(a.id, []),
                    )
                )

            is_downloaded = track_row.path is not None
            audio_src = (
                f"{BACKEND_URL}/spotify_scrapper/audio/{track_row.spotify_id}"
                if is_downloaded
                else None
            )

            a_result_album: Result[
                BaseAlbumWithoutSongsResponse
            ] = await get_album_without_songs_response_async(
                provider_name=provider_name,
                album_row=album_row,
                artist_rows=album_row.artists,
            )
            if a_result_album.is_not_ok():
                logger.error(
                    f"Error building album response for track {track_row.spotify_id}. "
                    f"{a_result_album.info()}"
                )
                return Result[list[SpotifyScrapperTrackResponse]].from_result(a_result_album)

            a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
                image=album_row.image
            )
            if a_result_image_url.is_not_ok():
                logger.error(f"Error getting track image URL. {a_result_image_url.info()}")
                return Result[list[SpotifyScrapperTrackResponse]].from_result(a_result_image_url)

            responses.append(
                SpotifyScrapperTrackResponse(
                    provider=provider_name,
                    publicId=track_row.core_song.public_id,
                    providerUrl=f"https://open.spotify.com/track/{track_row.spotify_id}",
                    name=track_row.name,
                    spotifyId=track_row.spotify_id,
                    artists=track_artist_responses,
                    audioUrl=audio_src,
                    downloaded=is_downloaded,
                    imageUrl=a_result_image_url.result(),
                    dominantColor=album_row.image.dominant_color,
                    duration_ms=track_row.duration_ms,
                    discNumber=track_row.disc_number,
                    trackNumber=track_row.track_number,
                    album=a_result_album.result(),
                )
            )

        return Result(code=ResultCode.OK, message="OK", result=responses)

    except Exception as e:
        logger.error(f"Error building bulk track responses: {e}")
        return Result(code=ResultCode.GENERAL_ERROR, message=str(e))


@time_it
async def get_artists_responses_async(
    session: AsyncSession,
    provider_name: str,
    artist_rows: list[ArtistRow],
) -> Result[list[SpotifyScrapperArtistResponse]]:
    if not artist_rows:
        return Result(code=ResultCode.OK, message="OK", result=[])

    try:
        artist_ids = [a.id for a in artist_rows]

        artist_genre_map: dict[int, list[str]] = defaultdict(list)
        if artist_ids:
            genre_result = await session.execute(
                select(artist_genres.c.artist_id, GenreRow.name)
                .join(GenreRow, GenreRow.id == artist_genres.c.genre_id)
                .where(artist_genres.c.artist_id.in_(artist_ids))
            )
            for row in genre_result.all():
                artist_genre_map[row.artist_id].append(row.name)

        responses: list[SpotifyScrapperArtistResponse] = []
        for artist_row in artist_rows:
            a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
                image=artist_row.image
            )
            if a_result_image_url.is_not_ok():
                logger.error(f"Error getting artist image URL. {a_result_image_url.info()}")
                return Result[list[SpotifyScrapperArtistResponse]].from_result(a_result_image_url)

            responses.append(
                SpotifyScrapperArtistResponse(
                    provider=provider_name,
                    publicId=artist_row.core_artist.public_id,
                    url=f"/artist/{artist_row.core_artist.public_id}",
                    providerUrl=f"https://open.spotify.com/artist/{artist_row.spotify_id}",
                    name=artist_row.name,
                    imageUrl=a_result_image_url.result(),
                    dominantColor=artist_row.image.dominant_color,
                    genres=artist_genre_map.get(artist_row.id, []),
                )
            )

        return Result(code=ResultCode.OK, message="OK", result=responses)

    except Exception as e:
        logger.error(f"Error building bulk artist responses: {e}")
        return Result(code=ResultCode.GENERAL_ERROR, message=str(e))


@time_it
async def get_albums_with_songs_responses_async(
    session: AsyncSession,
    provider_name: str,
    album_rows: list[AlbumRow],
) -> Result[list[SpotifyScrapperAlbumResponse]]:
    if not album_rows:
        return Result(code=ResultCode.OK, message="OK", result=[])

    try:
        album_ids = [a.id for a in album_rows]

        tracks_result = await session.execute(
            select(TrackRow).where(TrackRow.album_id.in_(album_ids))
        )
        all_tracks: list[TrackRow] = list(tracks_result.scalars().all())

        tracks_by_album: dict[int, list[TrackRow]] = defaultdict(list)
        for track in all_tracks:
            tracks_by_album[track.album_id].append(track)

        track_ids = [t.id for t in all_tracks]

        track_artist_map: dict[int, list[ArtistRow]] = defaultdict(list)
        if track_ids:
            link_result = await session.execute(
                select(song_artists.c.track_id, song_artists.c.artist_id).where(
                    song_artists.c.track_id.in_(track_ids)
                )
            )
            artist_links = list(link_result.all())
            all_artist_ids = list({row.artist_id for row in artist_links})

            artist_by_id: dict[int, ArtistRow] = {}
            if all_artist_ids:
                artist_result = await session.execute(
                    select(ArtistRow).where(ArtistRow.id.in_(all_artist_ids))
                )
                for artist in artist_result.scalars().all():
                    artist_by_id[artist.id] = artist

            for row in artist_links:
                artist = artist_by_id.get(row.artist_id)
                if artist:
                    track_artist_map[row.track_id].append(artist)
        else:
            all_artist_ids = []
            artist_by_id = {}

        artist_genre_map: dict[int, list[str]] = defaultdict(list)
        if artist_by_id:
            genre_result = await session.execute(
                select(artist_genres.c.artist_id, GenreRow.name)
                .join(GenreRow, GenreRow.id == artist_genres.c.genre_id)
                .where(artist_genres.c.artist_id.in_(list(artist_by_id.keys())))
            )
            for row in genre_result.all():
                artist_genre_map[row.artist_id].append(row.name)

        ext_image_map: dict[int, list[ExternalImageRow]] = defaultdict(list)
        if album_ids:
            link_result2 = await session.execute(
                select(
                    album_external_images.c.album_id,
                    album_external_images.c.external_image_id,
                ).where(album_external_images.c.album_id.in_(album_ids))
            )
            img_links = list(link_result2.all())
            img_ids = list({row.external_image_id for row in img_links})

            ext_img_by_id: dict[int, ExternalImageRow] = {}
            if img_ids:
                img_result = await session.execute(
                    select(ExternalImageRow).where(ExternalImageRow.id.in_(img_ids))
                )
                for img in img_result.scalars().all():
                    ext_img_by_id[img.id] = img

            for row in img_links:
                img = ext_img_by_id.get(row.external_image_id)
                if img:
                    ext_image_map[row.album_id].append(img)

        responses: list[SpotifyScrapperAlbumResponse] = []
        for album_row in album_rows:
            album_tracks = sorted(
                tracks_by_album.get(album_row.id, []),
                key=lambda t: (t.disc_number, t.track_number),
            )

            album_artist_responses: list[BaseArtistResponse] = []
            for a in album_row.artists:
                a_result_album_artist_image_url: Result[
                    str
                ] = await Image.get_internal_image_url_async(image=a.image)
                if a_result_album_artist_image_url.is_not_ok():
                    logger.error(
                        f"Error getting album artist image URL. "
                        f"{a_result_album_artist_image_url.info()}"
                    )
                    return Result[list[SpotifyScrapperAlbumResponse]].from_result(
                        a_result_album_artist_image_url
                    )

                album_artist_responses.append(
                    BaseArtistResponse(
                        provider=provider_name,
                        publicId=a.core_artist.public_id,
                        url=f"/artist/{a.core_artist.public_id}",
                        providerUrl=f"https://open.spotify.com/artist/{a.spotify_id}",
                        name=a.name,
                        imageUrl=a_result_album_artist_image_url.result(),
                        dominantColor=a.image.dominant_color,
                    )
                )

            a_result_album_image_url: Result[str] = await Image.get_internal_image_url_async(
                image=album_row.image
            )
            if a_result_album_image_url.is_not_ok():
                logger.error(f"Error getting album image URL. {a_result_album_image_url.info()}")
                return Result[list[SpotifyScrapperAlbumResponse]].from_result(
                    a_result_album_image_url
                )
            album_image_url: str = a_result_album_image_url.result()

            song_responses: list[BaseSongWithoutAlbumResponse] = []
            for track in album_tracks:
                track_artists = track_artist_map.get(track.id, [])
                track_artist_responses: list[SpotifyScrapperArtistResponse] = []
                for a in track_artists:
                    a_result_artist_image_url: Result[
                        str
                    ] = await Image.get_internal_image_url_async(image=a.image)
                    if a_result_artist_image_url.is_not_ok():
                        logger.error(
                            f"Error getting artist image URL. {a_result_artist_image_url.info()}"
                        )
                        return Result[list[SpotifyScrapperAlbumResponse]].from_result(
                            a_result_artist_image_url
                        )

                    track_artist_responses.append(
                        SpotifyScrapperArtistResponse(
                            provider=provider_name,
                            publicId=a.core_artist.public_id,
                            url=f"/artist/{a.core_artist.public_id}",
                            providerUrl=f"https://open.spotify.com/artist/{a.spotify_id}",
                            name=a.name,
                            imageUrl=a_result_artist_image_url.result(),
                            dominantColor=a.image.dominant_color,
                            genres=artist_genre_map.get(a.id, []),
                        )
                    )

                is_downloaded = track.path is not None
                audio_src = (
                    f"{BACKEND_URL}/spotify_scrapper/audio/{track.spotify_id}"
                    if is_downloaded
                    else None
                )

                song_responses.append(
                    BaseSongWithoutAlbumResponse(
                        provider=provider_name,
                        publicId=track.core_song.public_id,
                        providerUrl=f"https://open.spotify.com/track/{track.spotify_id}",
                        name=track.name,
                        artists=track_artist_responses,
                        audioUrl=audio_src,
                        downloaded=is_downloaded,
                        imageUrl=album_image_url,
                        dominantColor=album_row.image.dominant_color,
                        duration_ms=track.duration_ms,
                        discNumber=track.disc_number,
                        trackNumber=track.track_number,
                    )
                )

            ext_img_responses: list[SpotifyScrapperExternalImageResponse] = [
                SpotifyScrapperExternalImageResponse(
                    url=img.url, width=img.width, height=img.height
                )
                for img in ext_image_map.get(album_row.id, [])
            ]

            undownloaded_count = sum(1 for track in album_tracks if track.path is None)

            responses.append(
                SpotifyScrapperAlbumResponse(
                    provider=provider_name,
                    publicId=album_row.core_album.public_id,
                    url=f"/album/{album_row.core_album.public_id}",
                    providerUrl=f"https://open.spotify.com/album/{album_row.spotify_id}",
                    name=album_row.name,
                    imageUrl=album_image_url,
                    dominantColor=album_row.image.dominant_color,
                    artists=album_artist_responses,
                    releaseDate=album_row.release_date,
                    spotifyId=album_row.spotify_id,
                    externalImages=ext_img_responses,
                    songs=song_responses,
                    undownloadedCount=undownloaded_count,
                )
            )

        return Result(code=ResultCode.OK, message="OK", result=responses)

    except Exception as e:
        logger.error(f"Error building bulk album responses: {e}")
        return Result(code=ResultCode.GENERAL_ERROR, message=str(e))
