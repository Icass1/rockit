from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.backendUtils import time_it
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.spotifyScrapper.framework.models.spotifyScrapperApi import (
    ScrappedAlbum,
    ScrappedArtist,
    ScrappedPlaylist,
    ScrappedPlaylistItem,
    ScrappedSearchResults,
    ScrappedTrack,
    ScrappedImage,
)

from spotify_scraper import AsyncSpotifyClient
from spotify_scraper.models.common import (
    Image as ScraperImage,
    ArtistRef as ScraperArtistRef,
    AlbumRef as ScraperAlbumRef,
)
from spotify_scraper.models.track import Track as ScraperTrack
from spotify_scraper.models.album import Album as ScraperAlbum
from spotify_scraper.models.artist import Artist as ScraperArtist
from spotify_scraper.models.playlist import (
    Playlist as ScraperPlaylist,
    PlaylistTrack as ScraperPlaylistTrack,
)
from spotify_scraper.models.search import SearchResults as ScraperSearchResults

logger = getLogger(__name__)


# ── Conversion helpers (SpotifyScraper models → Scrapped* types) ─────────


def _to_scrapped_image(img: ScraperImage) -> ScrappedImage:
    return ScrappedImage(url=img.url, width=img.width, height=img.height)


def _artist_ref_to_scrapped(ref: ScraperArtistRef) -> ScrappedArtist:
    return ScrappedArtist(id=ref.id, name=ref.name)


def _album_ref_to_scrapped(ref: ScraperAlbumRef) -> ScrappedAlbum:
    return ScrappedAlbum(
        id=ref.id,
        name=ref.name,
        images=[_to_scrapped_image(img) for img in ref.images],
    )


def _track_to_scrapped(t: ScraperTrack) -> ScrappedTrack:
    album = None
    if t.album:
        album = _album_ref_to_scrapped(t.album)
    return ScrappedTrack(
        id=t.id,
        name=t.name,
        artists=[_artist_ref_to_scrapped(a) for a in t.artists],
        album=album,
        duration_ms=t.duration_ms,
        track_number=t.track_number or 0,
        disc_number=1,
        preview_url=t.preview_url,
    )


def _album_to_scrapped(a: ScraperAlbum) -> ScrappedAlbum:
    return ScrappedAlbum(
        id=a.id,
        name=a.name,
        artists=[_artist_ref_to_scrapped(ar) for ar in a.artists],
        images=[_to_scrapped_image(img) for img in a.images],
        release_date=a.release_date.strftime("%Y-%m-%d") if a.release_date else "",
        total_tracks=a.total_tracks or 0,
        copyrights=[{"type": "", "text": c} for c in a.copyrights],
        tracks=[_track_to_scrapped(t) for t in a.tracks],
    )


def _artist_to_scrapped(artist: ScraperArtist) -> ScrappedArtist:
    return ScrappedArtist(
        id=artist.id,
        name=artist.name,
        images=[_to_scrapped_image(img) for img in artist.images],
        followers=artist.followers or 0,
    )


def _playlist_track_to_scrapped(pt: ScraperPlaylistTrack) -> ScrappedPlaylistItem:
    return ScrappedPlaylistItem(
        track=_track_to_scrapped(pt.track) if pt.track else None,
        added_at=pt.added_at.isoformat() if pt.added_at else "",
        added_by=pt.added_by.name if pt.added_by else "",
    )


def _playlist_to_scrapped(p: ScraperPlaylist) -> ScrappedPlaylist:
    return ScrappedPlaylist(
        id=p.id,
        name=p.name,
        description=p.description or "",
        images=[_to_scrapped_image(img) for img in p.images],
        owner=p.owner.name if p.owner else "",
        tracks=[_playlist_track_to_scrapped(t) for t in p.tracks],
    )


def _search_results_to_scrapped(sr: ScraperSearchResults) -> ScrappedSearchResults:
    results = ScrappedSearchResults()
    results.tracks = [_track_to_scrapped(t) for t in sr.tracks]
    results.albums = [_album_ref_to_scrapped(a) for a in sr.albums]
    results.artists = [_artist_to_scrapped(a) for a in sr.artists]
    results.playlists = [_playlist_to_scrapped(p) for p in sr.playlists]
    return results


# ── The scraper API client ──────────────────────────────────────────────────


class SpotifyScrapperApi:

    @time_it
    async def get_albums_async(
        self, session: AsyncSession, ids: List[str]
    ) -> AResult[List[ScrappedAlbum]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            async with AsyncSpotifyClient(timeout=15.0) as client:
                results = await client.get_albums(ids)
                albums: List[ScrappedAlbum] = []
                for item in results:
                    if not item.ok or item.result is None:
                        continue
                    try:
                        albums.append(_album_to_scrapped(item.result))
                    except Exception as e:
                        logger.error(f"Error converting album: {e}")
                return AResult(code=AResultCode.OK, message="OK", result=albums)
        except Exception as e:
            logger.error(
                f"Failed to fetch albums from Spotify scraper: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to fetch albums from Spotify: {e}",
            )

    @time_it
    async def get_tracks_async(
        self, session: AsyncSession, ids: List[str]
    ) -> AResult[List[ScrappedTrack]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            async with AsyncSpotifyClient(timeout=15.0) as client:
                results = await client.get_tracks(ids)
                tracks: List[ScrappedTrack] = []
                for item in results:
                    if not item.ok or item.result is None:
                        continue
                    try:
                        tracks.append(_track_to_scrapped(item.result))
                    except Exception as e:
                        logger.error(f"Error converting track: {e}")
                return AResult(code=AResultCode.OK, message="OK", result=tracks)
        except Exception as e:
            logger.error(
                f"Failed to fetch tracks from Spotify scraper: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to fetch tracks from Spotify: {e}",
            )

    @time_it
    async def get_artists_async(
        self, session: AsyncSession, ids: List[str]
    ) -> AResult[List[ScrappedArtist]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            async with AsyncSpotifyClient(timeout=15.0) as client:
                results = await client.get_artists(ids)
                artists: List[ScrappedArtist] = []
                for item in results:
                    if not item.ok or item.result is None:
                        continue
                    try:
                        artists.append(_artist_to_scrapped(item.result))
                    except Exception as e:
                        logger.error(f"Error converting artist: {e}")
                return AResult(code=AResultCode.OK, message="OK", result=artists)
        except Exception as e:
            logger.error(
                f"Failed to fetch artists from Spotify scraper: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to fetch artists from Spotify: {e}",
            )

    async def get_playlist_async(
        self, session: AsyncSession, id: str
    ) -> AResult[ScrappedPlaylist]:
        try:
            async with AsyncSpotifyClient(timeout=15.0) as client:
                playlist = await client.get_playlist(id, max_tracks=None)
                result = _playlist_to_scrapped(playlist)
                return AResult(code=AResultCode.OK, message="OK", result=result)
        except Exception as e:
            logger.error(f"Error fetching playlist {id}: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error fetching playlist {id}: {e}",
            )

    async def search_async(self, query: str) -> AResult[ScrappedSearchResults]:
        try:
            async with AsyncSpotifyClient(timeout=15.0) as client:
                results = await client.search(query, limit=10)
                return AResult(
                    code=AResultCode.OK,
                    message="OK",
                    result=_search_results_to_scrapped(results),
                )
        except Exception as e:
            logger.error(f"Error searching Spotify: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error searching Spotify: {e}",
            )


spotify_scrapper_api = SpotifyScrapperApi()
