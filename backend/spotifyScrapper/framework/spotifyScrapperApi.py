import math
from typing import Any, Dict, List, cast
from urllib.parse import quote_plus

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.backendUtils import time_it
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.spotifyScrapper.framework.spotifyScrapperCache import SpotifyScrapperCache

from backend.spotifyScrapper.framework.models.spotifyScrapperApi import (
    ScrappedAlbum,
    ScrappedImage,
    ScrappedArtist,
    ScrappedPlaylist,
    ScrappedPlaylistItem,
    ScrappedSearchResults,
    ScrappedTrack,
)

logger = getLogger(__name__)


def parse_image(raw: Dict[str, Any]) -> ScrappedImage:
    raw_url: str = cast(str, raw.get("url", ""))
    raw_width: Any = raw.get("width")
    raw_height: Any = raw.get("height")
    return ScrappedImage(url=raw_url, width=raw_width, height=raw_height)


def parse_artist(raw: Dict[str, Any]) -> ScrappedArtist:
    raw_images: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("images", []) or []
    )
    raw_genres: List[str] = cast(List[str], raw.get("genres", []) or [])
    raw_followers: Dict[str, Any] = cast(Dict[str, Any], raw.get("followers", {}) or {})
    raw_popularity: int = cast(int, raw.get("popularity", 0) or 0)
    return ScrappedArtist(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        genres=raw_genres,
        images=[parse_image(i) for i in raw_images],
        followers=cast(int, raw_followers.get("total", 0) or 0),
        popularity=raw_popularity,
    )


def parse_track(raw: Dict[str, Any]) -> ScrappedTrack:
    raw_artists: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("artists", []) or []
    )
    raw_album: Dict[str, Any] | None = cast(Dict[str, Any] | None, raw.get("album"))
    album: ScrappedAlbum | None = None
    if raw_album is not None:
        raw_album_artists: List[Dict[str, Any]] = cast(
            List[Dict[str, Any]], raw_album.get("artists", []) or []
        )
        raw_album_images: List[Dict[str, Any]] = cast(
            List[Dict[str, Any]], raw_album.get("images", []) or []
        )
        album = ScrappedAlbum(
            id=cast(str, raw_album.get("id", "")),
            name=cast(str, raw_album.get("name", "")),
            artists=[parse_artist(a) for a in raw_album_artists],
            images=[parse_image(i) for i in raw_album_images],
            release_date=cast(str, raw_album.get("release_date", "")),
            total_tracks=cast(int, raw_album.get("total_tracks", 0)),
        )
    raw_ext_ids: Dict[str, Any] = cast(
        Dict[str, Any], raw.get("external_ids", {}) or {}
    )
    return ScrappedTrack(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        artists=[parse_artist(a) for a in raw_artists],
        album=album,
        duration_ms=cast(int, raw.get("duration_ms", 0) or 0),
        track_number=cast(int, raw.get("track_number", 0) or 0),
        disc_number=cast(int, raw.get("disc_number", 1) or 1),
        popularity=cast(int, raw.get("popularity", 0) or 0),
        isrc=cast(str, raw_ext_ids.get("isrc", "")),
        preview_url=cast(str | None, raw.get("preview_url")),
    )


def parse_album(raw: Dict[str, Any]) -> ScrappedAlbum:
    raw_artists: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("artists", []) or []
    )
    raw_images: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("images", []) or []
    )
    raw_tracks_obj: Dict[str, Any] | None = cast(
        Dict[str, Any] | None, raw.get("tracks")
    )
    raw_tracks: List[Dict[str, Any]]
    if raw_tracks_obj is not None:
        raw_tracks = cast(List[Dict[str, Any]], raw_tracks_obj.get("items", []) or [])
    else:
        raw_tracks = cast(List[Dict[str, Any]], raw.get("tracks", []) or [])
    raw_copyrights: List[Dict[str, str]] = cast(
        List[Dict[str, str]], raw.get("copyrights", []) or []
    )
    return ScrappedAlbum(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        artists=[parse_artist(a) for a in raw_artists],
        images=[parse_image(i) for i in raw_images],
        release_date=cast(str, raw.get("release_date", "")),
        total_tracks=cast(int, raw.get("total_tracks", 0)),
        popularity=cast(int, raw.get("popularity", 0) or 0),
        copyrights=[
            {"type": c.get("type", ""), "text": c.get("text", "")}
            for c in raw_copyrights
        ],
        tracks=[parse_track(t) for t in raw_tracks],
    )


def parse_playlist_item(raw: Dict[str, Any]) -> ScrappedPlaylistItem:
    raw_track: Dict[str, Any] | None = cast(Dict[str, Any] | None, raw.get("track"))
    track: ScrappedTrack | None = (
        parse_track(raw_track) if raw_track is not None else None
    )
    raw_added_by: Dict[str, Any] | None = cast(
        Dict[str, Any] | None, raw.get("added_by")
    )
    return ScrappedPlaylistItem(
        track=track,
        added_at=cast(str, raw.get("added_at", "")),
        added_by=cast(
            str, raw_added_by.get("id", "") if raw_added_by is not None else ""
        ),
    )


def parse_playlist(raw: Dict[str, Any]) -> ScrappedPlaylist:
    raw_images: List[Dict[str, Any]] = cast(
        List[Dict[str, Any]], raw.get("images", []) or []
    )
    raw_tracks_obj: Dict[str, Any] | None = cast(
        Dict[str, Any] | None, raw.get("tracks")
    )
    raw_tracks: List[Dict[str, Any]]
    if raw_tracks_obj is not None:
        raw_tracks = cast(List[Dict[str, Any]], raw_tracks_obj.get("items", []) or [])
    else:
        raw_tracks = cast(List[Dict[str, Any]], [])
    raw_owner: Dict[str, Any] = cast(Dict[str, Any], raw.get("owner", {}) or {})
    return ScrappedPlaylist(
        id=cast(str, raw.get("id", "")),
        name=cast(str, raw.get("name", "")),
        description=cast(str, raw.get("description", "") or ""),
        images=[parse_image(i) for i in raw_images],
        owner=cast(
            str, raw_owner.get("display_name", "") or raw_owner.get("id", "") or ""
        ),
        tracks=[parse_playlist_item(t) for t in raw_tracks],
    )


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
