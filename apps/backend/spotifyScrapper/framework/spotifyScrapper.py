import os
import uuid
from typing import TYPE_CHECKING

import requests as req
from fastapi import Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from constants import IMAGES_PATH, MEDIA_PATH
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from core.aResult import AResult, AResultCode
from core.framework.media.image import Image
from core.framework.media.stream import MediaStream
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.searchResponse import (
    ArtistSearchResultsItem,
    BaseSearchResultsItem,
)
from core.utils.timeIt import time_it
from logger import getLogger
from spotifyScrapper.access.db.ormModels.album import AlbumRow
from spotifyScrapper.access.db.ormModels.artist import ArtistRow
from spotifyScrapper.access.db.ormModels.playlist import PlaylistRow
from spotifyScrapper.access.db.ormModels.track import TrackRow
from spotifyScrapper.access.spotifyScrapperAccess import SpotifyScrapperAccess
from spotifyScrapper.framework.models.spotifyScrapperApi import ScrappedImage
from spotifyScrapper.framework.spotifyScrapperApi import (
    ScrappedAlbum,
    ScrappedArtist,
    ScrappedPlaylist,
    ScrappedSearchResults,
    ScrappedTrack,
    spotify_scrapper_api,
)
from spotifyScrapper.responses.albumResponse import (
    SpotifyScrapperAlbumResponse,
)
from spotifyScrapper.responses.artistResponse import (
    SpotifyScrapperArtistResponse,
)
from spotifyScrapper.responses.songResponse import SpotifyScrapperTrackResponse
from spotifyScrapper.utils.conversions import (
    get_album_with_songs_response_async,
    get_artist_response_async,
    get_playlist_with_medias_response_async,
    get_track_response_async,
)

if TYPE_CHECKING:
    from spotifyScrapper.framework.provider.spotifyScrapperProvider import (
        SpotifyScrapperProvider,
    )

logger = getLogger(__name__)


class SpotifyScrapper:
    provider: "SpotifyScrapperProvider"
    provider_name: str

    @staticmethod
    @time_it
    async def _download_and_create_internal_image(
        session: AsyncSession,
        url: str,
    ) -> AResult[ImageRow]:
        """Download an image from a URL, save it locally, and create an ImageRow."""

        try:
            response = req.get(url, timeout=10)
            if response.status_code != 200:
                return AResult(code=AResultCode.GENERAL_ERROR, message="Image download failed")
            filename = str(uuid.uuid4()) + ".jpg"
            full_path = os.path.join(IMAGES_PATH, filename)
            with open(full_path, "wb") as f:
                f.write(response.content)
            return await Image.create_image_async(session=session, path=filename, url=url)
        except Exception as e:
            logger.error(f"Failed to download/create internal image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/create internal image: {e}",
            )

    @staticmethod
    def _get_largest_image(images: list[ScrappedImage]) -> ScrappedImage | None:
        """Return the largest image by area, or None if empty."""

        if not images:
            return None
        return max(
            images,
            key=lambda img: (img.width or 0) * (img.height or 0),
        )

    @staticmethod
    async def search_async(query: str, limit: int = 10) -> AResult[list[BaseSearchResultsItem]]:
        """Search Spotify (scraper API) and map results to BaseSearchResultsItem list."""

        a_result_search: AResult[ScrappedSearchResults] = await spotify_scrapper_api.search_async(
            query, limit=limit
        )
        if a_result_search.is_not_ok():
            logger.error(f"Error searching Spotify scrapper. {a_result_search.info()}")
            return AResult(code=a_result_search.code(), message=a_result_search.message())

        result = a_result_search.result()
        items: list[BaseSearchResultsItem] = []

        if result.tracks:
            for track in result.tracks:
                if not track.id or not track.name:
                    continue
                track_image_url: str = ""
                if track.album and track.album.images and track.album.images:
                    track_image_url = track.album.images[0].url
                track_artists: list[ArtistSearchResultsItem] = [
                    ArtistSearchResultsItem(name=a.name, url=f"/spotify_scrapper/artist/{a.id}")
                    for a in track.artists
                    if a.id
                ]
                items.append(
                    BaseSearchResultsItem(
                        type="song",
                        name=track.name,
                        providerUrl=f"https://open.spotify.com/track/{track.id}",
                        imageUrl=track_image_url,
                        artists=track_artists,
                        provider=SpotifyScrapper.provider_name,
                        downloaded=False,
                        url=None,
                    )
                )

        if result.albums:
            for album in result.albums:
                if not album.id or not album.name:
                    continue
                album_image_url: str = ""
                if album.images and album.images:
                    album_image_url = album.images[0].url
                album_artists: list[ArtistSearchResultsItem] = [
                    ArtistSearchResultsItem(name=a.name, url=f"/spotify_scrapper/artist/{a.id}")
                    for a in album.artists
                    if a.id
                ]
                items.append(
                    BaseSearchResultsItem(
                        type="album",
                        name=album.name,
                        providerUrl=f"https://open.spotify.com/album/{album.id}",
                        imageUrl=album_image_url,
                        artists=album_artists,
                        provider=SpotifyScrapper.provider_name,
                        downloaded=None,
                        url=None,
                    )
                )

        if result.artists:
            for artist in result.artists:
                if not artist.id or not artist.name:
                    continue
                artist_image_url: str = ""
                artist_image = SpotifyScrapper._get_largest_image(artist.images)
                if artist_image:
                    artist_image_url = artist_image.url
                items.append(
                    BaseSearchResultsItem(
                        type="artist",
                        name=artist.name,
                        providerUrl=f"https://open.spotify.com/artist/{artist.id}",
                        imageUrl=artist_image_url,
                        artists=[],
                        provider=SpotifyScrapper.provider_name,
                        downloaded=None,
                        url=None,
                    )
                )

        if result.playlists:
            for playlist in result.playlists:
                if not playlist.id:
                    continue
                playlist_image_url: str = ""
                if playlist.images and playlist.images:
                    playlist_image_url = playlist.images[0].url
                items.append(
                    BaseSearchResultsItem(
                        type="playlist",
                        name=playlist.name,
                        providerUrl=f"https://open.spotify.com/playlist/{playlist.id}",
                        imageUrl=playlist_image_url,
                        artists=[],
                        provider=SpotifyScrapper.provider_name,
                        downloaded=None,
                        url=None,
                    )
                )

        return AResult(code=AResultCode.OK, message="OK", result=items)

    @staticmethod
    @time_it
    async def get_album_async(
        session: AsyncSession, spotify_id: str
    ) -> AResult[SpotifyScrapperAlbumResponse]:
        """
        Get an album by ID, fetching from Spotify scraper API and populating the database if
        not found.
        """

        a_result_album: AResult[AlbumRow] = await SpotifyScrapperAccess.get_album_public_id_async(
            session=session, spotify_id=spotify_id
        )
        if a_result_album.is_ok():
            return await get_album_with_songs_response_async(
                session=session,
                provider_name=SpotifyScrapper.provider_name,
                album_row=a_result_album.result(),
            )

        if a_result_album.code() != AResultCode.NOT_FOUND:
            logger.error("Error getting album from database.")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        a_result_api_albums: AResult[
            list[ScrappedAlbum]
        ] = await spotify_scrapper_api.get_albums_async(session=session, ids=[spotify_id])
        if a_result_api_albums.is_not_ok():
            logger.error("Error getting album from Spotify scraper API.")
            return AResult(code=a_result_api_albums.code(), message=a_result_api_albums.message())

        raw_albums: list[ScrappedAlbum] = a_result_api_albums.result()
        if not raw_albums:
            return AResult(code=AResultCode.NOT_FOUND, message="Album not found on Spotify")

        raw_album: ScrappedAlbum = raw_albums[0]

        track_ids: list[str] = []
        if raw_album.tracks:
            track_ids = [item.id for item in raw_album.tracks if item.id]

        a_result_api_tracks: AResult[
            list[ScrappedTrack]
        ] = await spotify_scrapper_api.get_tracks_async(session=session, ids=track_ids)
        api_tracks: list[ScrappedTrack] = (
            a_result_api_tracks.result() if a_result_api_tracks.is_ok() else []
        )

        artist_ids: list[str] = list(
            {a.id for a in (raw_album.artists or []) if a.id}
            | {a.id for t in api_tracks for a in (t.artists or []) if a.id}
        )

        a_result_api_artists: AResult[
            list[ScrappedArtist]
        ] = await spotify_scrapper_api.get_artists_async(session=session, ids=artist_ids)
        api_artists: list[ScrappedArtist] = (
            a_result_api_artists.result() if a_result_api_artists.is_ok() else []
        )

        a_result_provider_id: AResult[int] = SpotifyScrapper.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id: int = a_result_provider_id.result()

        artist_map: dict[str, ArtistRow] = {}
        for raw_artist in api_artists:
            if not raw_artist.id:
                continue
            artist_image_id: int | None = None
            largest = SpotifyScrapper._get_largest_image(raw_artist.images)
            if largest and largest.url:
                a_img = await SpotifyScrapper._download_and_create_internal_image(
                    session, largest.url
                )
                if a_img.is_ok():
                    artist_image_id = a_img.result().id
            a_result_create_artist: AResult[
                ArtistRow
            ] = await SpotifyScrapperAccess.get_or_create_artist(
                raw=raw_artist,
                session=session,
                provider_id=provider_id,
                image_id=artist_image_id,
            )
            if a_result_create_artist.is_ok():
                artist_map[raw_artist.id] = a_result_create_artist.result()

        album_image_id: int | None = None
        largest = SpotifyScrapper._get_largest_image(raw_album.images)
        if largest and largest.url:
            a_img = await SpotifyScrapper._download_and_create_internal_image(session, largest.url)
            if a_img.is_ok():
                album_image_id = a_img.result().id
        a_album: AResult[AlbumRow] = await SpotifyScrapperAccess.get_or_create_album(
            raw=raw_album,
            artist_map=artist_map,
            session=session,
            provider_id=provider_id,
            image_id=album_image_id,
        )
        if a_album.is_not_ok():
            return AResult(code=a_album.code(), message=a_album.message())

        album_row: AlbumRow = a_album.result()

        for raw_track in api_tracks:
            await SpotifyScrapperAccess.get_or_create_track(
                raw=raw_track,
                artist_map=artist_map,
                album_row=album_row,
                session=session,
                provider_id=provider_id,
            )

        return await get_album_with_songs_response_async(
            session=session,
            provider_name=SpotifyScrapper.provider_name,
            album_row=album_row,
        )

    @staticmethod
    async def get_track_async(
        session: AsyncSession, spotify_id: str
    ) -> AResult[SpotifyScrapperTrackResponse]:
        """
        Get a track by ID, fetching from Spotify scraper API and populating the database if
        not found.
        """

        a_result_track: AResult[TrackRow] = await SpotifyScrapperAccess.get_track_spotify_id_async(
            spotify_id=spotify_id, session=session
        )
        if a_result_track.is_ok():
            return await get_track_response_async(
                session=session,
                provider_name=SpotifyScrapper.provider_name,
                track_row=a_result_track.result(),
            )

        if a_result_track.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        a_result_api_tracks: AResult[
            list[ScrappedTrack]
        ] = await spotify_scrapper_api.get_tracks_async(session=session, ids=[spotify_id])
        if a_result_api_tracks.is_not_ok():
            return AResult(code=a_result_api_tracks.code(), message=a_result_api_tracks.message())

        raw_tracks: list[ScrappedTrack] = a_result_api_tracks.result()
        if not raw_tracks:
            logger.error(f"Track {spotify_id} not found on Spotify")
            return AResult(code=AResultCode.NOT_FOUND, message="Track not found on Spotify")

        raw_track: ScrappedTrack = raw_tracks[0]

        album_id: str = raw_track.album.id if raw_track.album else ""

        a_result_albums: AResult[list[ScrappedAlbum]] = await spotify_scrapper_api.get_albums_async(
            session=session, ids=[album_id]
        )
        raw_albums: list[ScrappedAlbum] = (
            a_result_albums.result() if a_result_albums.is_ok() else []
        )

        if len(raw_albums) != 1:
            logger.error(f"Received {len(raw_albums)} instead of 1.")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Received {len(raw_albums)} instead of 1.",
            )

        raw_album: ScrappedAlbum = raw_albums[0]

        album_track_ids: list[str] = []
        if raw_album and raw_album.tracks:
            album_track_ids = [item.id for item in raw_album.tracks if item.id]

        a_result_album_tracks: AResult[
            list[ScrappedTrack]
        ] = await spotify_scrapper_api.get_tracks_async(session=session, ids=album_track_ids)
        raw_album_tracks: list[ScrappedTrack] = (
            a_result_album_tracks.result() if a_result_album_tracks.is_ok() else []
        )

        artist_ids: list[str] = list(
            {a.id for t in raw_album_tracks for a in (t.artists or []) if a.id}
            | {a.id for album in raw_albums for a in (album.artists or []) if a.id}
        )

        a_result_artists: AResult[
            list[ScrappedArtist]
        ] = await spotify_scrapper_api.get_artists_async(session=session, ids=artist_ids)
        raw_artists: list[ScrappedArtist] = (
            a_result_artists.result() if a_result_artists.is_ok() else []
        )

        a_result_provider_id: AResult[int] = SpotifyScrapper.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        created_core_song: CoreMediaRow | None = None
        provider_id: int = a_result_provider_id.result()
        artist_map: dict[str, ArtistRow] = {}
        for raw_artist in raw_artists:
            if not raw_artist.id:
                continue
            artist_image_id: int | None = None
            largest = SpotifyScrapper._get_largest_image(raw_artist.images)
            if largest and largest.url:
                a_img = await SpotifyScrapper._download_and_create_internal_image(
                    session, largest.url
                )
                if a_img.is_ok():
                    artist_image_id = a_img.result().id
            a = await SpotifyScrapperAccess.get_or_create_artist(
                session=session,
                raw=raw_artist,
                provider_id=provider_id,
                image_id=artist_image_id,
            )
            if a.is_ok():
                artist_map[raw_artist.id] = a.result()
            else:
                logger.error(f"Failed to get/create artist {raw_artist.id}: {a.message()}")

        album_image_id: int | None = None
        largest = SpotifyScrapper._get_largest_image(raw_album.images)
        if largest and largest.url:
            a_img = await SpotifyScrapper._download_and_create_internal_image(session, largest.url)
            if a_img.is_ok():
                album_image_id = a_img.result().id
        a_result_album: AResult[AlbumRow] = await SpotifyScrapperAccess.get_or_create_album(
            raw=raw_album,
            artist_map=artist_map,
            session=session,
            provider_id=provider_id,
            image_id=album_image_id,
        )
        if a_result_album.is_not_ok():
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album_row: AlbumRow = a_result_album.result()

        for t in raw_album_tracks:
            a_result_create_track: AResult[
                tuple[TrackRow, CoreMediaRow]
            ] = await SpotifyScrapperAccess.get_or_create_track(
                raw=t,
                artist_map=artist_map,
                album_row=album_row,
                provider_id=provider_id,
                session=session,
            )

            if a_result_create_track.is_not_ok():
                logger.error(
                    f"Error creating spotify_scrapper track. {a_result_create_track.info()}"
                )
                continue

            if t.id == spotify_id:
                created_core_song = a_result_create_track.result()[1]

        if not created_core_song:
            return AResult(code=AResultCode.GENERAL_ERROR, message="core_song is None")

        a_result_fetched_track: AResult[
            TrackRow
        ] = await SpotifyScrapperAccess.get_track_spotify_id_async(
            session=session, spotify_id=spotify_id
        )
        if a_result_fetched_track.is_not_ok():
            return AResult(
                code=a_result_fetched_track.code(),
                message=a_result_fetched_track.message(),
            )

        return await get_track_response_async(
            session=session,
            provider_name=SpotifyScrapper.provider_name,
            track_row=a_result_fetched_track.result(),
        )

    @staticmethod
    async def get_artist_async(
        session: AsyncSession, spotify_id: str
    ) -> AResult[SpotifyScrapperArtistResponse]:
        """
        Get an artist by ID, fetching from Spotify scraper API and populating the database if
        not found.
        """

        a_result_artist: AResult[
            ArtistRow
        ] = await SpotifyScrapperAccess.get_artist_public_id_async(
            session=session, spotify_id=spotify_id
        )
        if a_result_artist.is_ok():
            return await get_artist_response_async(
                session=session,
                provider_name=SpotifyScrapper.provider_name,
                artist_row=a_result_artist.result(),
            )

        if a_result_artist.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_artist.code(), message=a_result_artist.message())

        a_result_api_artists: AResult[
            list[ScrappedArtist]
        ] = await spotify_scrapper_api.get_artists_async(session=session, ids=[spotify_id])
        if a_result_api_artists.is_not_ok():
            return AResult(code=a_result_api_artists.code(), message=a_result_api_artists.message())

        raw_artists = a_result_api_artists.result()
        if not raw_artists:
            return AResult(code=AResultCode.NOT_FOUND, message="Artist not found on Spotify")

        raw_artist = raw_artists[0]

        a_result_provider_id: AResult[int] = SpotifyScrapper.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id: int = a_result_provider_id.result()

        artist_image_id: int | None = None
        largest = SpotifyScrapper._get_largest_image(raw_artist.images)
        if largest and largest.url:
            a_img = await SpotifyScrapper._download_and_create_internal_image(session, largest.url)
            if a_img.is_ok():
                artist_image_id = a_img.result().id
        a: AResult[ArtistRow] = await SpotifyScrapperAccess.get_or_create_artist(
            session=session,
            raw=raw_artist,
            provider_id=provider_id,
            image_id=artist_image_id,
        )
        if a.is_not_ok():
            return AResult(code=a.code(), message=a.message())

        a_result_fetched_artist: AResult[
            ArtistRow
        ] = await SpotifyScrapperAccess.get_artist_public_id_async(
            session=session, spotify_id=spotify_id
        )
        if a_result_fetched_artist.is_not_ok():
            return AResult(
                code=a_result_fetched_artist.code(),
                message=a_result_fetched_artist.message(),
            )

        return await get_artist_response_async(
            session=session,
            provider_name=SpotifyScrapper.provider_name,
            artist_row=a_result_fetched_artist.result(),
        )

    @staticmethod
    async def get_playlist_with_medias_async(
        session: AsyncSession, spotify_id: str
    ) -> AResult[BasePlaylistWithMediasResponse]:
        """
        Get a playlist by ID, fetching from Spotify scraper API and populating the database if
        not found.
        """

        a_result_playlist: AResult[
            PlaylistRow
        ] = await SpotifyScrapperAccess.get_playlist_public_id_async(
            session=session, spotify_id=spotify_id
        )
        if a_result_playlist.is_ok():
            return await get_playlist_with_medias_response_async(
                session=session,
                provider_name=SpotifyScrapper.provider_name,
                playlist_row=a_result_playlist.result(),
            )

        if a_result_playlist.code() != AResultCode.NOT_FOUND:
            return AResult(code=a_result_playlist.code(), message=a_result_playlist.message())

        logger.info(f"Playlist {spotify_id} not in DB, fetching from Spotify API...")
        a_result_api_playlist: AResult[
            ScrappedPlaylist
        ] = await spotify_scrapper_api.get_playlist_async(session=session, id=spotify_id)
        if a_result_api_playlist.is_not_ok():
            return AResult(
                code=a_result_api_playlist.code(),
                message=a_result_api_playlist.message(),
            )

        raw_playlist: ScrappedPlaylist = a_result_api_playlist.result()

        track_ids: list[str] = []
        album_ids_set: set[str] = set()
        if raw_playlist.tracks:
            for item in raw_playlist.tracks:
                if item.track and item.track.id:
                    track_ids.append(item.track.id)
                if item.track and item.track.album and item.track.album.id:
                    album_ids_set.add(item.track.album.id)

        album_ids: list[str] = list(album_ids_set)

        a_result_albums: AResult[list[ScrappedAlbum]] = await spotify_scrapper_api.get_albums_async(
            session=session, ids=album_ids
        )
        raw_albums: list[ScrappedAlbum] = (
            a_result_albums.result() if a_result_albums.is_ok() else []
        )

        artist_ids: list[str] = list(
            {
                a.id
                for item in (raw_playlist.tracks or [])
                if item.track
                for a in (item.track.artists or [])
                if a.id
            }
            | {a.id for album in raw_albums for a in (album.artists or []) if a.id}
        )

        a_result_artists: AResult[
            list[ScrappedArtist]
        ] = await spotify_scrapper_api.get_artists_async(session=session, ids=artist_ids)
        raw_artists: list[ScrappedArtist] = (
            a_result_artists.result() if a_result_artists.is_ok() else []
        )

        a_result_full_tracks: AResult[
            list[ScrappedTrack]
        ] = await spotify_scrapper_api.get_tracks_async(session=session, ids=track_ids)

        raw_full_tracks: list[ScrappedTrack] = (
            a_result_full_tracks.result() if a_result_full_tracks.is_ok() else []
        )
        full_track_map: dict[str, ScrappedTrack] = {t.id: t for t in raw_full_tracks if t.id}

        a_result_provider_id: AResult[int] = SpotifyScrapper.provider.get_id()

        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id: int = a_result_provider_id.result()
        artist_map: dict[str, ArtistRow] = {}
        for raw_artist in raw_artists:
            if not raw_artist.id:
                continue
            artist_image_id: int | None = None
            largest = SpotifyScrapper._get_largest_image(raw_artist.images)
            if largest and largest.url:
                a_img = await SpotifyScrapper._download_and_create_internal_image(
                    session, largest.url
                )
                if a_img.is_ok():
                    artist_image_id = a_img.result().id
            a: AResult[ArtistRow] = await SpotifyScrapperAccess.get_or_create_artist(
                raw=raw_artist,
                provider_id=provider_id,
                session=session,
                image_id=artist_image_id,
            )
            if a.is_ok():
                artist_map[raw_artist.id] = a.result()

        album_row_map: dict[str, AlbumRow] = {}
        for raw_album in raw_albums:
            if not raw_album.id:
                continue
            album_image_id: int | None = None
            largest = SpotifyScrapper._get_largest_image(raw_album.images)
            if largest and largest.url:
                a_img = await SpotifyScrapper._download_and_create_internal_image(
                    session, largest.url
                )
                if a_img.is_ok():
                    album_image_id = a_img.result().id
            a_result_album: AResult[AlbumRow] = await SpotifyScrapperAccess.get_or_create_album(
                raw=raw_album,
                artist_map=artist_map,
                session=session,
                provider_id=provider_id,
                image_id=album_image_id,
            )
            if a_result_album.is_ok():
                album_row_map[raw_album.id] = a_result_album.result()

        track_row_map: dict[str, TrackRow] = {}
        for track_id in track_ids:
            raw_track: ScrappedTrack | None = full_track_map.get(track_id)
            if not raw_track or not raw_track.id:
                continue
            raw_track_album_id: str = raw_track.album.id if raw_track.album else ""
            album_row: AlbumRow | None = album_row_map.get(raw_track_album_id)
            if album_row is None:
                continue
            a_result_track: AResult[
                tuple[TrackRow, CoreMediaRow]
            ] = await SpotifyScrapperAccess.get_or_create_track(
                raw=raw_track,
                artist_map=artist_map,
                album_row=album_row,
                session=session,
                provider_id=provider_id,
            )
            if a_result_track.is_ok():
                track_row_map[raw_track.id] = a_result_track.result()[0]

        playlist_image_id: int | None = None
        largest = SpotifyScrapper._get_largest_image(raw_playlist.images)
        if largest and largest.url:
            a_img = await SpotifyScrapper._download_and_create_internal_image(session, largest.url)
            if a_img.is_ok():
                playlist_image_id = a_img.result().id
        a_result_playlist = await SpotifyScrapperAccess.get_or_create_playlist(
            raw=raw_playlist,
            track_row_map=track_row_map,
            session=session,
            provider_id=provider_id,
            image_id=playlist_image_id,
        )

        if a_result_playlist.is_not_ok():
            return AResult(
                code=a_result_playlist.code(),
                message=a_result_playlist.message(),
            )

        a_result_fetched_playlist: AResult[
            PlaylistRow
        ] = await SpotifyScrapperAccess.get_playlist_public_id_async(
            session=session, spotify_id=spotify_id
        )
        if a_result_fetched_playlist.is_not_ok():
            return AResult(
                code=a_result_fetched_playlist.code(),
                message=a_result_fetched_playlist.message(),
            )

        return await get_playlist_with_medias_response_async(
            session=session,
            provider_name=SpotifyScrapper.provider_name,
            playlist_row=a_result_fetched_playlist.result(),
        )

    # ── Bulk methods ───────────────────────────────────────────────────────────

    @staticmethod
    async def get_albums_from_db(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[AlbumRow]]:
        """Get albums from database by their Spotify IDs."""
        a_result = await SpotifyScrapperAccess.get_albums_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting albums from DB. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_missing_album_ids(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[str]]:
        """Get album IDs that are not in the database."""
        a_result_existing = await SpotifyScrapperAccess.get_albums_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        existing_ids: set[str] = (
            {a.spotify_id for a in a_result_existing.result()}
            if a_result_existing.is_ok()
            else set()
        )
        missing_ids = [sid for sid in spotify_ids if sid not in existing_ids]
        return AResult(code=AResultCode.OK, message="OK", result=missing_ids)

    @staticmethod
    async def fetch_albums_from_spotify(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[ScrappedAlbum]]:
        """Fetch albums from Spotify scraper API (via cache)."""
        a_result = await spotify_scrapper_api.get_albums_async(session=session, ids=spotify_ids)
        if a_result.is_not_ok():
            logger.error(f"Error fetching albums from Spotify. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def fetch_tracks_from_spotify(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[ScrappedTrack]]:
        """Fetch tracks from Spotify scraper API (via cache)."""
        a_result = await spotify_scrapper_api.get_tracks_async(session=session, ids=spotify_ids)
        if a_result.is_not_ok():
            logger.error(f"Error fetching tracks from Spotify. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def fetch_artists_from_spotify(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[ScrappedArtist]]:
        """Fetch artists from Spotify scraper API (via cache)."""
        a_result = await spotify_scrapper_api.get_artists_async(session=session, ids=spotify_ids)
        if a_result.is_not_ok():
            logger.error(f"Error fetching artists from Spotify. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_albums_async(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[AlbumRow]]:
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

        a_result_existing = await SpotifyScrapper.get_albums_from_db(
            session=session, spotify_ids=spotify_ids
        )
        existing_albums: list[AlbumRow] = (
            a_result_existing.result() if a_result_existing.is_ok() else []
        )

        existing_album_ids: set[str] = {a.spotify_id for a in existing_albums}
        spotify_ids_to_fetch: list[str] = [
            sid for sid in spotify_ids if sid not in existing_album_ids
        ]

        missing_album_ids: list[str] = spotify_ids_to_fetch
        if not missing_album_ids:
            return a_result_existing

        a_result_raw_albums = await SpotifyScrapper.fetch_albums_from_spotify(
            session=session, spotify_ids=missing_album_ids
        )
        raw_albums: list[ScrappedAlbum] = (
            a_result_raw_albums.result() if a_result_raw_albums.is_ok() else []
        )

        track_ids: list[str] = []
        for raw_album in raw_albums:
            if raw_album.tracks:
                for item in raw_album.tracks:
                    if item.id:
                        track_ids.append(item.id)

        a_result_raw_tracks = await SpotifyScrapper.fetch_tracks_from_spotify(
            session=session, spotify_ids=track_ids
        )
        raw_tracks: list[ScrappedTrack] = (
            a_result_raw_tracks.result() if a_result_raw_tracks.is_ok() else []
        )

        artist_ids_set: set[str] = set()
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

        a_result_raw_artists = await SpotifyScrapper.fetch_artists_from_spotify(
            session=session, spotify_ids=list(artist_ids_set)
        )
        raw_artists: list[ScrappedArtist] = (
            a_result_raw_artists.result() if a_result_raw_artists.is_ok() else []
        )

        a_result_provider_id: AResult[int] = SpotifyScrapper.provider.get_id()
        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id: int = a_result_provider_id.result()

        artist_map: dict[str, ArtistRow] = {}
        for raw_artist in raw_artists:
            if not raw_artist.id:
                continue
            artist_image_id: int | None = None
            largest = SpotifyScrapper._get_largest_image(raw_artist.images)
            if largest and largest.url:
                a_img = await SpotifyScrapper._download_and_create_internal_image(
                    session, largest.url
                )
                if a_img.is_ok():
                    artist_image_id = a_img.result().id
            a_result_artist = await SpotifyScrapperAccess.get_or_create_artist(
                session=session,
                raw=raw_artist,
                provider_id=provider_id,
                image_id=artist_image_id,
            )
            if a_result_artist.is_ok():
                artist_map[raw_artist.id] = a_result_artist.result()

        album_map: dict[str, AlbumRow] = {}
        for raw_album in raw_albums:
            if not raw_album.id:
                continue
            album_image_id: int | None = None
            largest = SpotifyScrapper._get_largest_image(raw_album.images)
            if largest and largest.url:
                a_img = await SpotifyScrapper._download_and_create_internal_image(
                    session, largest.url
                )
                if a_img.is_ok():
                    album_image_id = a_img.result().id
            a_result_album = await SpotifyScrapperAccess.get_or_create_album(
                session=session,
                raw=raw_album,
                artist_map=artist_map,
                provider_id=provider_id,
                image_id=album_image_id,
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
            await SpotifyScrapperAccess.get_or_create_track(
                session=session,
                raw=raw_track,
                artist_map=artist_map,
                album_row=album_row,
                provider_id=provider_id,
            )

        a_result_new = await SpotifyScrapper.get_albums_from_db(
            session=session, spotify_ids=missing_album_ids
        )
        new_albums: list[AlbumRow] = a_result_new.result() if a_result_new.is_ok() else []
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=existing_albums + new_albums,
        )

    @staticmethod
    async def get_tracks_from_db(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[TrackRow]]:
        """Get tracks from database by their Spotify IDs."""
        a_result = await SpotifyScrapperAccess.get_tracks_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting tracks from DB. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_missing_track_ids(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[str]]:
        """Get track IDs that are not in the database."""
        a_result_existing = await SpotifyScrapperAccess.get_tracks_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        existing_ids: set[str] = (
            {t.spotify_id for t in a_result_existing.result()}
            if a_result_existing.is_ok()
            else set()
        )
        missing_ids = [sid for sid in spotify_ids if sid not in existing_ids]
        return AResult(code=AResultCode.OK, message="OK", result=missing_ids)

    @staticmethod
    async def get_tracks_async(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[TrackRow]]:
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

        a_result_existing = await SpotifyScrapper.get_tracks_from_db(
            session=session, spotify_ids=spotify_ids
        )
        existing_tracks: list[TrackRow] = (
            a_result_existing.result() if a_result_existing.is_ok() else []
        )

        existing_track_ids: set[str] = {t.spotify_id for t in existing_tracks}
        missing_track_ids: list[str] = [sid for sid in spotify_ids if sid not in existing_track_ids]

        if not missing_track_ids:
            return a_result_existing

        a_result_raw_tracks = await SpotifyScrapper.fetch_tracks_from_spotify(
            session=session, spotify_ids=missing_track_ids
        )
        raw_tracks: list[ScrappedTrack] = (
            a_result_raw_tracks.result() if a_result_raw_tracks.is_ok() else []
        )

        album_ids: set[str] = set()
        for raw_track in raw_tracks:
            if raw_track.album and raw_track.album.id:
                album_ids.add(raw_track.album.id)

        if album_ids:
            await SpotifyScrapper.get_albums_async(session=session, spotify_ids=list(album_ids))

        a_result_new = await SpotifyScrapper.get_tracks_from_db(
            session=session, spotify_ids=missing_track_ids
        )
        new_tracks: list[TrackRow] = a_result_new.result() if a_result_new.is_ok() else []
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=existing_tracks + new_tracks,
        )

    @staticmethod
    async def get_artists_from_db(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[ArtistRow]]:
        """Get artists from database by their Spotify IDs."""
        a_result = await SpotifyScrapperAccess.get_artists_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting artists from DB. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_missing_artist_ids(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[str]]:
        """Get artist IDs that are not in the database."""
        a_result_existing = await SpotifyScrapperAccess.get_artists_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        existing_ids: set[str] = (
            {a.spotify_id for a in a_result_existing.result()}
            if a_result_existing.is_ok()
            else set()
        )
        missing_ids = [sid for sid in spotify_ids if sid not in existing_ids]
        return AResult(code=AResultCode.OK, message="OK", result=missing_ids)

    @staticmethod
    async def get_artists_async(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[ArtistRow]]:
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

        a_result_existing = await SpotifyScrapper.get_artists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        existing_artists: list[ArtistRow] = (
            a_result_existing.result() if a_result_existing.is_ok() else []
        )

        existing_artist_ids: set[str] = {a.spotify_id for a in existing_artists}
        spotify_ids_to_fetch: list[str] = [
            sid for sid in spotify_ids if sid not in existing_artist_ids
        ]

        missing_artist_ids: list[str] = spotify_ids_to_fetch
        if not missing_artist_ids:
            return a_result_existing

        a_result_raw_artists = await SpotifyScrapper.fetch_artists_from_spotify(
            session=session, spotify_ids=missing_artist_ids
        )
        raw_artists: list[ScrappedArtist] = (
            a_result_raw_artists.result() if a_result_raw_artists.is_ok() else []
        )

        a_result_provider_id: AResult[int] = SpotifyScrapper.provider.get_id()
        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id: int = a_result_provider_id.result()

        artist_map: dict[str, ArtistRow] = {}
        for raw_artist in raw_artists:
            if not raw_artist.id:
                continue
            artist_image_id: int | None = None
            largest = SpotifyScrapper._get_largest_image(raw_artist.images)
            if largest and largest.url:
                a_img = await SpotifyScrapper._download_and_create_internal_image(
                    session, largest.url
                )
                if a_img.is_ok():
                    artist_image_id = a_img.result().id
            a_result_artist = await SpotifyScrapperAccess.get_or_create_artist(
                session=session,
                raw=raw_artist,
                provider_id=provider_id,
                image_id=artist_image_id,
            )
            if a_result_artist.is_ok():
                artist_map[raw_artist.id] = a_result_artist.result()

        a_result_new = await SpotifyScrapper.get_artists_from_db(
            session=session, spotify_ids=missing_artist_ids
        )
        new_artists: list[ArtistRow] = a_result_new.result() if a_result_new.is_ok() else []
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=existing_artists + new_artists,
        )

    @staticmethod
    async def get_playlists_from_db(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[PlaylistRow]]:
        """Get playlists from database by their Spotify IDs."""
        a_result = await SpotifyScrapperAccess.get_playlists_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting playlists from DB. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_missing_playlist_ids(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[str]]:
        """Get playlist IDs that are not in the database."""
        a_result_existing = await SpotifyScrapperAccess.get_playlists_by_spotify_ids_async(
            session=session, spotify_ids=spotify_ids
        )
        existing_ids: set[str] = (
            {p.spotify_id for p in a_result_existing.result()}
            if a_result_existing.is_ok()
            else set()
        )
        missing_ids = [sid for sid in spotify_ids if sid not in existing_ids]
        return AResult(code=AResultCode.OK, message="OK", result=missing_ids)

    @staticmethod
    async def get_playlists_async(
        session: AsyncSession, spotify_ids: list[str]
    ) -> AResult[list[PlaylistRow]]:
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

        a_result_existing = await SpotifyScrapper.get_playlists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        existing_playlists: list[PlaylistRow] = (
            a_result_existing.result() if a_result_existing.is_ok() else []
        )

        existing_playlist_ids: set[str] = {p.spotify_id for p in existing_playlists}
        spotify_ids_to_fetch: list[str] = [
            sid for sid in spotify_ids if sid not in existing_playlist_ids
        ]

        a_result_missing = await SpotifyScrapper.get_missing_playlist_ids(
            session=session, spotify_ids=spotify_ids_to_fetch
        )
        if a_result_missing.is_not_ok():
            return AResult(code=a_result_missing.code(), message=a_result_missing.message())

        missing_playlist_ids: list[str] = a_result_missing.result()
        if not missing_playlist_ids:
            return a_result_existing

        a_result_provider_id: AResult[int] = SpotifyScrapper.provider.get_id()
        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(code=a_result_provider_id.code(), message=a_result_provider_id.message())

        provider_id: int = a_result_provider_id.result()

        for playlist_id in missing_playlist_ids:
            a_result_raw_playlist = await spotify_scrapper_api.get_playlist_async(
                session=session, id=playlist_id
            )
            if a_result_raw_playlist.is_not_ok():
                logger.error(
                    f"Error fetching playlist {playlist_id}. {a_result_raw_playlist.info()}"
                )
                continue

            raw_playlist: ScrappedPlaylist = a_result_raw_playlist.result()

            track_ids: list[str] = []
            album_ids: set[str] = set()
            if raw_playlist.tracks:
                for item in raw_playlist.tracks:
                    if item.track and item.track.id:
                        track_ids.append(item.track.id)
                    if item.track and item.track.album and item.track.album.id:
                        album_ids.add(item.track.album.id)

            if album_ids:
                await SpotifyScrapper.get_albums_async(session=session, spotify_ids=list(album_ids))

            await SpotifyScrapper.get_tracks_async(session=session, spotify_ids=track_ids)

            a_result_tracks = await SpotifyScrapper.get_tracks_from_db(
                session=session, spotify_ids=track_ids
            )
            db_tracks: list[TrackRow] = a_result_tracks.result() if a_result_tracks.is_ok() else []
            track_row_map: dict[str, TrackRow] = {t.spotify_id: t for t in db_tracks}

            playlist_image_id: int | None = None
            largest = SpotifyScrapper._get_largest_image(raw_playlist.images)
            if largest and largest.url:
                a_img = await SpotifyScrapper._download_and_create_internal_image(
                    session, largest.url
                )
                if a_img.is_ok():
                    playlist_image_id = a_img.result().id
            await SpotifyScrapperAccess.get_or_create_playlist(
                session=session,
                raw=raw_playlist,
                track_row_map=track_row_map,
                provider_id=provider_id,
                image_id=playlist_image_id,
            )

        return await SpotifyScrapper.get_playlists_from_db(session=session, spotify_ids=spotify_ids)

    # ── Bulk public_id → spotify_id resolvers ────────────────────────────────

    @staticmethod
    async def get_tracks_spotify_id_from_public_ids_async(
        session: AsyncSession, public_ids: list[str]
    ) -> AResult[dict[str, str]]:
        """Bulk-resolve public_ids to spotify_ids for tracks."""
        return await SpotifyScrapperAccess.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )

    @staticmethod
    async def get_artists_spotify_id_from_public_ids_async(
        session: AsyncSession, public_ids: list[str]
    ) -> AResult[dict[str, str]]:
        """Bulk-resolve public_ids to spotify_ids for artists."""
        return await SpotifyScrapperAccess.get_artists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )

    @staticmethod
    async def get_playlists_spotify_id_from_public_ids_async(
        session: AsyncSession, public_ids: list[str]
    ) -> AResult[dict[str, str]]:
        """Bulk-resolve public_ids to spotify_ids for playlists."""
        return await SpotifyScrapperAccess.get_playlists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )

    @staticmethod
    async def get_albums_spotify_id_from_public_ids_async(
        session: AsyncSession, public_ids: list[str]
    ) -> AResult[dict[str, str]]:
        """Bulk-resolve public_ids to spotify_ids for albums."""
        return await SpotifyScrapperAccess.get_albums_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )

    @staticmethod
    async def get_album_rows_from_public_ids_async(
        session: AsyncSession, public_ids: list[str]
    ) -> AResult[list[AlbumRow]]:
        """Fetch AlbumRows for multiple public_ids in one query."""
        return await SpotifyScrapperAccess.get_album_rows_from_public_ids_async(
            session=session, public_ids=public_ids
        )

    @staticmethod
    async def get_audio_with_range_async(
        session: AsyncSession, spotify_id: str, request: Request
    ) -> AResult[StreamingResponse]:
        """Stream the existing audio file with exact HTTP byte ranges."""

        a_result_track: AResult[TrackRow] = await SpotifyScrapperAccess.get_track_spotify_id_async(
            session=session, spotify_id=spotify_id
        )
        if a_result_track.is_not_ok():
            logger.error(f"Error getting track. {a_result_track.info()}")
            return AResult(code=a_result_track.code(), message=a_result_track.message())

        track_row: TrackRow = a_result_track.result()

        if not track_row.path:
            logger.error(f"Track {spotify_id} has no audio file downloaded.")
            return AResult(code=AResultCode.NOT_FOUND, message="Audio file not downloaded")

        full_path: str = os.path.join(MEDIA_PATH, track_row.path)
        return await MediaStream.stream_audio_file_async(
            audio_path=full_path, range_header=request.headers.get("Range")
        )
