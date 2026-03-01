import os
import math
import json
import base64
import httpx
from typing import Any, Dict, List
from urllib.parse import quote_plus
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.constants import CLIENT_ID, CLIENT_SECRET
from backend.spotify.framework.spotifyCache import SpotifyCache
from backend.utils.logger import getLogger

from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.spotify.spotifyApiTypes.rawSpotifyApiTrack import RawSpotifyApiTrack
from backend.spotify.spotifyApiTypes.rawSpotifyApiArtist import RawSpotifyApiArtist
from backend.spotify.spotifyApiTypes.rawSpotifyApiPlaylist import RawSpotifyApiPlaylist
from backend.spotify.spotifyApiTypes.rawSpotifyApiSearchResults import (
    RawSpotifyApiSearchResults,
)

logger = getLogger(__name__)


class SpotifyApi:

    def __init__(self) -> None:
        self.client_id: str = CLIENT_ID
        self.client_secret: str = CLIENT_SECRET

        self.token: str | None = None
        self.get_token(from_file=True)

    def get_token(self, from_file: bool = False):

        if not self.client_id:
            logger.critical("client_id not set")
            return

        if not self.client_secret:
            logger.critical("client_secret not set")
            return

        if from_file and os.path.exists(".spotify_cache/token"):
            with open(".spotify_cache/token", "r") as f:
                self.token = f.read()
            logger.info("New Spotify API token from cache.")

            return

        auth_string = self.client_id + ":" + self.client_secret
        auth_bytes = auth_string.encode("utf-8")
        auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

        url = "https://accounts.spotify.com/api/token"
        headers = {
            "Authorization": "Basic " + auth_base64,
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data: Dict[str, str] = {"grant_type": "client_credentials"}

        result: httpx.Response = httpx.post(url, headers=headers, data=data)
        json_response = json.loads(result.content)

        try:
            self.token = json_response["access_token"]
        except Exception as e:
            logger.critical(f"Unable to get access_token {e}.")
            logger.critical(
                f"Received response code {result.status_code} from Spotify API"
            )

        if self.token:
            if not os.path.exists(".spotify_cache"):
                os.makedirs(".spotify_cache")
            with open(".spotify_cache/token", "w") as f:
                f.write(self.token)

        logger.info("New Spotify API token.")

    def get_auth_header(self):
        if not self.token:
            logger.critical("token not set")
            return

        return {"Authorization": "Bearer " + self.token}

    async def api_call(
        self, path: str, params: Dict[str, str] = {}
    ) -> AResult[Dict[str, Any]]:

        parsed_params = ""

        for index, k in enumerate(list(params.items())):
            if index != 0:
                parsed_params += "&"
            parsed_params += k[0] + "=" + k[1]

        url: str = f"https://api.spotify.com/v1/{path}"
        headers: None | Dict[str, str] = self.get_auth_header()

        query_url: str = url + ("?" + parsed_params if len(parsed_params) > 0 else "")

        logger.warning(f"Spotify api call: {query_url}")

        async with httpx.AsyncClient() as client:
            result: httpx.Response = await client.get(query_url, headers=headers)
            if result.status_code == 401:
                logger.info("Token espired")
                self.get_token()
                headers = self.get_auth_header()
                result = await client.get(query_url, headers=headers)

            if result.status_code != 200:
                logger.error(
                    f"Error in api_call. URL: {result.url}, Status Code: {result.status_code}, Text: {result.text}"
                )
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Call to url {result.url} resulted in status sode {result.status_code}, text received: {result.text}",
                )
            try:
                return AResult(
                    code=AResultCode.OK, message="OK", result=json.loads(result.content)
                )
            except:
                logger.critical(
                    f"Unable to load json. {result.content=}, {result.text=} {result.status_code=}"
                )
                return AResult(
                    code=AResultCode.GENERAL_ERROR, message="Unable to parse json"
                )

    async def get_albums_async(
        self, session: AsyncSession, ids: List[str]
    ) -> AResult[List[RawSpotifyApiAlbum]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        # Cache-first: fetch cached rows via SpotifyCache
        a_result_cached = await SpotifyCache.get_albums_async(session=session, ids=ids)
        cached_albums: List[RawSpotifyApiAlbum] = (
            a_result_cached.result() if a_result_cached.is_ok() else []
        )
        cached_ids: set[str] = {album.id for album in cached_albums}

        missing_ids: List[str] = [id for id in ids if id not in cached_ids]

        fresh_albums: List[RawSpotifyApiAlbum] = []
        max_data_per_call = 20

        for i in range(
            math.ceil(len(missing_ids) / max_data_per_call) if missing_ids else 0
        ):
            batch: List[str] = missing_ids[
                i * max_data_per_call : (i + 1) * max_data_per_call
            ]
            a_result_response = await self.api_call(
                path="albums", params={"ids": ",".join(batch)}
            )

            if a_result_response.is_not_ok():
                logger.error(f"Error in api_call. {a_result_response.info()}")
                continue

            albums: List[Dict[str, Any]] = a_result_response.result()["albums"]

            for album in albums:
                album_id = album.get("id")
                if album_id:
                    await SpotifyCache.add_album_async(
                        session=session, id=album_id, json=album
                    )
                fresh_albums.append(RawSpotifyApiAlbum.from_dict(album))

        return AResult(
            AResultCode.OK, message="OK", result=cached_albums + fresh_albums
        )

    async def get_tracks_async(
        self, session: AsyncSession, ids: List[str]
    ) -> AResult[List[RawSpotifyApiTrack]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        # Cache-first via SpotifyCache
        a_result_cached = await SpotifyCache.get_tracks_async(session=session, ids=ids)
        cached_tracks: List[RawSpotifyApiTrack] = (
            a_result_cached.result() if a_result_cached.is_ok() else []
        )
        cached_ids: set[str] = {track.id for track in cached_tracks}

        missing_ids: List[str] = [id for id in ids if id not in cached_ids]

        fresh_tracks: List[RawSpotifyApiTrack] = []
        max_data_per_call = 50

        for i in range(
            math.ceil(len(missing_ids) / max_data_per_call) if missing_ids else 0
        ):
            batch: List[str] = missing_ids[
                i * max_data_per_call : (i + 1) * max_data_per_call
            ]
            a_result_response = await self.api_call(
                path="tracks", params={"ids": ",".join(batch)}
            )

            if a_result_response.is_not_ok():
                logger.error(
                    f"Error in get_tracks_async api_call. {a_result_response.info()}"
                )
                continue

            tracks: List[Dict[str, Any]] = a_result_response.result()["tracks"]

            for track in tracks:
                track_id = track.get("id")
                if track_id:
                    await SpotifyCache.add_track_async(
                        session=session, id=track_id, json=track
                    )
                fresh_tracks.append(RawSpotifyApiTrack.from_dict(track))

        return AResult(
            AResultCode.OK, message="OK", result=cached_tracks + fresh_tracks
        )

    async def get_artists_async(
        self, session: AsyncSession, ids: List[str]
    ) -> AResult[List[RawSpotifyApiArtist]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        # Cache-first via SpotifyCache
        a_result_cached = await SpotifyCache.get_artists_async(session=session, ids=ids)
        cached_artists: List[RawSpotifyApiArtist] = (
            a_result_cached.result() if a_result_cached.is_ok() else []
        )
        cached_ids = {artist.id for artist in cached_artists}

        missing_ids: List[str] = [id for id in ids if id not in cached_ids]

        fresh_artists: List[RawSpotifyApiArtist] = []
        max_data_per_call = 50

        for i in range(
            math.ceil(len(missing_ids) / max_data_per_call) if missing_ids else 0
        ):
            batch = missing_ids[i * max_data_per_call : (i + 1) * max_data_per_call]
            a_result_response = await self.api_call(
                path="artists", params={"ids": ",".join(batch)}
            )

            if a_result_response.is_not_ok():
                logger.error(
                    f"Error in get_artists_async api_call. {a_result_response.info()}"
                )
                continue

            artists: List[Dict[str, Any]] = a_result_response.result()["artists"]

            for artist in artists:
                artist_id = artist.get("id")
                if artist_id:
                    await SpotifyCache.add_artist_async(
                        session=session, id=artist_id, json=artist
                    )
                fresh_artists.append(RawSpotifyApiArtist.from_dict(artist))

        return AResult(
            AResultCode.OK, message="OK", result=cached_artists + fresh_artists
        )

    async def get_playlist_async(
        self, session: AsyncSession, id: str
    ) -> AResult[RawSpotifyApiPlaylist]:
        # Cache-first via SpotifyCache
        a_result_cached = await SpotifyCache.get_playlist_async(session=session, id=id)
        if a_result_cached.is_ok():
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=a_result_cached.result(),
            )

        a_result_response = await self.api_call(path=f"playlists/{id}")
        if a_result_response.is_not_ok():
            logger.error(
                f"Error in get_playlist_async api_call. {a_result_response.info()}"
            )
            return AResult(
                code=a_result_response.code(), message=a_result_response.message()
            )

        playlist_json = a_result_response.result()
        await SpotifyCache.add_playlist_async(
            session=session, id=id, json=playlist_json
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RawSpotifyApiPlaylist.from_dict(playlist_json),
        )

    async def search_async(self, query: str) -> AResult[RawSpotifyApiSearchResults]:
        """Search Spotify for tracks, albums, artists, and playlists matching the query."""

        try:
            a_result_response: AResult[Dict[str, Any]] = await self.api_call(
                path="search",
                params={
                    "q": quote_plus(query),
                    "type": "track,album,artist,playlist",
                    "limit": "10",
                },
            )
        except Exception as e:
            logger.error(f"Error in search_async api_call. {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Exception during Spotify search api call: {e}",
            )

        if a_result_response.is_not_ok():
            logger.error(f"Error in search_async api_call. {a_result_response.info()}")
            return AResult(
                code=a_result_response.code(), message=a_result_response.message()
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RawSpotifyApiSearchResults.from_dict(a_result_response.result()),
        )


spotify_api = SpotifyApi()
