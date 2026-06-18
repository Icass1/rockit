import math
from typing import Any, Dict, List
from urllib.parse import quote_plus

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.backendUtils import time_it
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.spotifyScrapper.framework.spotifyScrapperCache import SpotifyScrapperCache

from backend.spotifyScrapper.framework.models.spotifyScrapperApi import (
    ScrappedAlbum,
    ScrappedArtist,
    ScrappedPlaylist,
    ScrappedSearchResults,
    ScrappedTrack,
    parse_album,
    parse_artist,
    parse_image,
    parse_playlist,
    parse_playlist_item,
    parse_track,
)

logger = getLogger(__name__)


# ── The scraper API client ──────────────────────────────────────────────────


class SpotifyScrapperApi:

    SEARCH_URL = "https://api.spotify.com/v1/search"
    TRACKS_URL = "https://api.spotify.com/v1/tracks"
    ALBUMS_URL = "https://api.spotify.com/v1/albums"
    ARTISTS_URL = "https://api.spotify.com/v1/artists"

    _token: str | None = None

    async def _ensure_token_async(self) -> AResult[str]:
        if self._token:
            return AResult(code=AResultCode.OK, message="OK", result=self._token)

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="Spotify API token not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
        )

    async def _api_call_async(
        self, url: str, params: Dict[str, str] | None = None
    ) -> AResult[Dict[str, Any]]:
        a_result_token: AResult[str] = await self._ensure_token_async()
        if a_result_token.is_not_ok():
            logger.warning(f"No Spotify token available: {a_result_token.message()}")
            return AResult(
                code=AResultCode.NOT_IMPLEMENTED,
                message=f"Spotify scraping requires API credentials: {a_result_token.message()}",
            )

        token = a_result_token.result()
        headers = {"Authorization": f"Bearer {token}"}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url, headers=headers, params=params, timeout=30
                )
                if response.status_code == 401:
                    self._token = None
                    return AResult(
                        code=AResultCode.GENERAL_ERROR,
                        message="Spotify API token expired. Please refresh.",
                    )
                if response.status_code != 200:
                    logger.error(
                        f"Spotify scraper API error: {response.status_code} {response.text[:500]}"
                    )
                    return AResult(
                        code=AResultCode.GENERAL_ERROR,
                        message=f"Spotify API error: {response.status_code}",
                    )
                return AResult(
                    code=AResultCode.OK,
                    message="OK",
                    result=response.json(),
                )
        except Exception as e:
            logger.error(f"Spotify scraper API call failed: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Spotify scraper API call failed: {e}",
            )

    @time_it
    async def get_albums_async(
        self, session: AsyncSession, ids: List[str]
    ) -> AResult[List[ScrappedAlbum]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_cached = await SpotifyScrapperCache.get_albums_async(
            session=session, ids=ids
        )
        cached_albums: List[ScrappedAlbum] = (
            a_result_cached.result() if a_result_cached.is_ok() else []
        )
        cached_ids: set[str] = {a.id for a in cached_albums}
        missing_ids: List[str] = [i for i in ids if i not in cached_ids]

        fresh_albums: List[ScrappedAlbum] = []
        max_per_call = 20

        for i in range(
            math.ceil(len(missing_ids) / max_per_call) if missing_ids else 0
        ):
            batch: List[str] = missing_ids[i * max_per_call : (i + 1) * max_per_call]
            a_result_response = await self._api_call_async(
                url=self.ALBUMS_URL,
                params={"ids": ",".join(batch)},
            )
            if a_result_response.is_not_ok():
                logger.error(f"Error fetching albums: {a_result_response.info()}")
                continue

            raw_albums: List[Dict[str, Any]] = a_result_response.result().get(
                "albums", []
            )
            for raw in raw_albums:
                album_id = raw.get("id")
                if album_id:
                    await SpotifyScrapperCache.add_album_async(
                        session=session, id=album_id, json=raw
                    )
                fresh_albums.append(parse_album(raw))

        return AResult(
            code=AResultCode.OK, message="OK", result=cached_albums + fresh_albums
        )

    @time_it
    async def get_tracks_async(
        self, session: AsyncSession, ids: List[str]
    ) -> AResult[List[ScrappedTrack]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_cached = await SpotifyScrapperCache.get_tracks_async(
            session=session, ids=ids
        )
        cached_tracks: List[ScrappedTrack] = (
            a_result_cached.result() if a_result_cached.is_ok() else []
        )
        cached_ids: set[str] = {t.id for t in cached_tracks}
        missing_ids: List[str] = [i for i in ids if i not in cached_ids]

        fresh_tracks: List[ScrappedTrack] = []
        max_per_call = 50

        for i in range(
            math.ceil(len(missing_ids) / max_per_call) if missing_ids else 0
        ):
            batch = missing_ids[i * max_per_call : (i + 1) * max_per_call]
            a_result_response = await self._api_call_async(
                url=self.TRACKS_URL,
                params={"ids": ",".join(batch)},
            )
            if a_result_response.is_not_ok():
                logger.error(f"Error fetching tracks: {a_result_response.info()}")
                continue

            raw_tracks: List[Dict[str, Any]] = a_result_response.result().get(
                "tracks", []
            )
            for raw in raw_tracks:
                track_id = raw.get("id")
                if track_id:
                    await SpotifyScrapperCache.add_track_async(
                        session=session, id=track_id, json=raw
                    )
                fresh_tracks.append(parse_track(raw))

        return AResult(
            code=AResultCode.OK, message="OK", result=cached_tracks + fresh_tracks
        )

    @time_it
    async def get_artists_async(
        self, session: AsyncSession, ids: List[str]
    ) -> AResult[List[ScrappedArtist]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        a_result_cached = await SpotifyScrapperCache.get_artists_async(
            session=session, ids=ids
        )
        cached_artists: List[ScrappedArtist] = (
            a_result_cached.result() if a_result_cached.is_ok() else []
        )
        cached_ids: set[str] = {a.id for a in cached_artists}
        missing_ids: List[str] = [i for i in ids if i not in cached_ids]

        fresh_artists: List[ScrappedArtist] = []
        max_per_call = 50

        for i in range(
            math.ceil(len(missing_ids) / max_per_call) if missing_ids else 0
        ):
            batch = missing_ids[i * max_per_call : (i + 1) * max_per_call]
            a_result_response = await self._api_call_async(
                url=self.ARTISTS_URL,
                params={"ids": ",".join(batch)},
            )
            if a_result_response.is_not_ok():
                logger.error(f"Error fetching artists: {a_result_response.info()}")
                continue

            raw_artists: List[Dict[str, Any]] = a_result_response.result().get(
                "artists", []
            )
            for raw in raw_artists:
                artist_id = raw.get("id")
                if artist_id:
                    await SpotifyScrapperCache.add_artist_async(
                        session=session, id=artist_id, json=raw
                    )
                fresh_artists.append(parse_artist(raw))

        return AResult(
            code=AResultCode.OK, message="OK", result=cached_artists + fresh_artists
        )

    async def get_playlist_async(
        self, session: AsyncSession, id: str
    ) -> AResult[ScrappedPlaylist]:
        a_result_cached = await SpotifyScrapperCache.get_playlist_async(
            session=session, id=id
        )
        if a_result_cached.is_ok():
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=a_result_cached.result(),
            )

        a_result_response = await self._api_call_async(
            url=f"https://api.spotify.com/v1/playlists/{id}",
        )
        if a_result_response.is_not_ok():
            return AResult(
                code=a_result_response.code(), message=a_result_response.message()
            )

        raw = a_result_response.result()
        await SpotifyScrapperCache.add_playlist_async(session=session, id=id, json=raw)

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=parse_playlist(raw),
        )

    async def search_async(self, query: str) -> AResult[ScrappedSearchResults]:
        a_result_response = await self._api_call_async(
            url=self.SEARCH_URL,
            params={
                "q": quote_plus(query),
                "type": "track,album,artist,playlist",
                "limit": "10",
            },
        )
        if a_result_response.is_not_ok():
            return AResult(
                code=a_result_response.code(), message=a_result_response.message()
            )

        raw = a_result_response.result()
        results = ScrappedSearchResults()

        if "tracks" in raw and "items" in raw["tracks"]:
            results.tracks = [parse_track(t) for t in raw["tracks"]["items"] if t]
        if "albums" in raw and "items" in raw["albums"]:
            results.albums = [parse_album(a) for a in raw["albums"]["items"] if a]
        if "artists" in raw and "items" in raw["artists"]:
            results.artists = [parse_artist(a) for a in raw["artists"]["items"] if a]
        if "playlists" in raw and "items" in raw["playlists"]:
            results.playlists = [
                parse_playlist(p) for p in raw["playlists"]["items"] if p
            ]

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=results,
        )


spotify_scrapper_api = SpotifyScrapperApi()
