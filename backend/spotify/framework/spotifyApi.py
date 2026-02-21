import os
import math
import json
import base64
import requests
from typing import Any, Dict, List

from backend.core.aResult import AResult, AResultCode
from backend.constants import CLIENT_ID, CLIENT_SECRET
from backend.spotify.access.db.ormModels.albumCache import CacheAlbumRow
from backend.spotify.access.db.ormModels.artistCache import CacheArtistRow
from backend.spotify.access.db.ormModels.trackCache import CacheTrackRow
from backend.spotify.access.spotifyCacheAccess import SpotifyCacheAccess
from backend.utils.logger import getLogger

from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.spotify.spotifyApiTypes.rawSpotifyApiTrack import RawSpotifyApiTrack
from backend.spotify.spotifyApiTypes.rawSpotifyApiArtist import RawSpotifyApiArtist
from backend.spotify.spotifyApiTypes.rawSpotifyApiPlaylist import RawSpotifyApiPlaylist

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

        auth_string = self.client_id + ':' + self.client_secret
        auth_bytes = auth_string.encode('utf-8')
        auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

        url = "https://accounts.spotify.com/api/token"
        headers = {
            "Authorization": "Basic " + auth_base64,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data: Dict[str, str] = {"grant_type": "client_credentials"}

        result: requests.Response = requests.post(
            url, headers=headers, data=data)
        json_response = json.loads(result.content)

        try:
            self.token = json_response["access_token"]
        except Exception as e:
            logger.critical("Unable to get access_token")
            logger.critical(
                f"Received response code {result.status_code} from Spotify API")

        if self.token:
            with open(".spotify_cache/token", "w") as f:
                f.write(self.token)

        logger.info("New Spotify API token.")

    def get_auth_header(self):
        if not self.token:
            logger.critical("token not set")
            return

        return {"Authorization": "Bearer " + self.token}

    def api_call(self, path: str, params: Dict[str, str] = {}) -> AResult[Dict[str, Any]]:

        parsed_params = ""

        for index, k in enumerate(list(params.items())):
            if index != 0:
                parsed_params += "&"
            parsed_params += k[0] + "=" + k[1]

        url = f"https://api.spotify.com/v1/{path}"
        headers = self.get_auth_header()

        query_url = url + \
            ("?" + parsed_params if len(parsed_params) > 0 else "")

        logger.warning(f"Spotify api call: {query_url}")

        result = requests.get(query_url, headers=headers)
        if result.status_code == 401:
            logger.info("Token espired")
            self.get_token()
            headers = self.get_auth_header()
            result = requests.get(query_url, headers=headers)

        if result.status_code != 200:
            logger.error(
                f"Error in api_call. URL: {result.url}, Status Code: {result.status_code}, Text: {result.text}")
            return AResult(code=AResultCode.GENERAL_ERROR, message=f"Call to url {result.url} resulted in status sode {result.status_code}, text received: {result.text}")
        try:
            return AResult(code=AResultCode.OK, message="OK", result=json.loads(result.content))
        except:
            logger.critical(
                f"Unable to load json. {result.content=}, {result.text=} {result.status_code=}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Unable to parse json")

    async def get_albums_async(self, ids: List[str]) -> AResult[List[RawSpotifyApiAlbum]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        # Cache-first: fetch cached rows
        a_result_cached: AResult[List[CacheAlbumRow]] = await SpotifyCacheAccess.get_albums_by_ids_async(ids)
        cached_rows: List[CacheAlbumRow] = a_result_cached.result() if a_result_cached.is_ok() else []
        cached_ids: set[str] = {row.id for row in cached_rows}
        cached_albums: List[RawSpotifyApiAlbum] = [RawSpotifyApiAlbum.from_dict(row.json) for row in cached_rows]

        missing_ids: List[str] = [id for id in ids if id not in cached_ids]

        fresh_albums: List[RawSpotifyApiAlbum] = []
        max_data_per_call = 20

        for i in range(math.ceil(len(missing_ids) / max_data_per_call) if missing_ids else 0):
            batch = missing_ids[i * max_data_per_call:(i + 1) * max_data_per_call]
            a_result_response = self.api_call(
                path="albums", params={"ids": ",".join(batch)})

            if a_result_response.is_not_ok():
                logger.error(f"Error in api_call. {a_result_response.info()}")
                continue

            albums: List[Dict[str, Any]] = a_result_response.result()["albums"]

            for album in albums:
                album_id = album.get("id")
                if album_id:
                    await SpotifyCacheAccess.add_album_async(album_id, album)
                fresh_albums.append(RawSpotifyApiAlbum.from_dict(album))

        return AResult(AResultCode.OK, message="OK", result=cached_albums + fresh_albums)

    async def get_tracks_async(self, ids: List[str]) -> AResult[List[RawSpotifyApiTrack]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        # Cache-first
        a_result_cached: AResult[List[CacheTrackRow]] = await SpotifyCacheAccess.get_tracks_by_ids_async(ids)
        cached_rows = a_result_cached.result() if a_result_cached.is_ok() else []
        cached_ids: set[str] = {row.id for row in cached_rows}
        cached_tracks: List[RawSpotifyApiTrack] = [RawSpotifyApiTrack.from_dict(row.json) for row in cached_rows]

        missing_ids: List[str] = [id for id in ids if id not in cached_ids]

        fresh_tracks: List[RawSpotifyApiTrack] = []
        max_data_per_call = 50

        for i in range(math.ceil(len(missing_ids) / max_data_per_call) if missing_ids else 0):
            batch: List[str] = missing_ids[i * max_data_per_call:(i + 1) * max_data_per_call]
            a_result_response = self.api_call(
                path="tracks", params={"ids": ",".join(batch)})

            if a_result_response.is_not_ok():
                logger.error(f"Error in get_tracks_async api_call. {a_result_response.info()}")
                continue

            tracks: List[Dict[str, Any]] = a_result_response.result()["tracks"]

            for track in tracks:
                if track is None:
                    continue
                track_id = track.get("id")
                if track_id:
                    await SpotifyCacheAccess.add_track_async(track_id, track)
                fresh_tracks.append(RawSpotifyApiTrack.from_dict(track))

        return AResult(AResultCode.OK, message="OK", result=cached_tracks + fresh_tracks)

    async def get_artists_async(self, ids: List[str]) -> AResult[List[RawSpotifyApiArtist]]:
        if not ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        # Cache-first
        a_result_cached: AResult[List[CacheArtistRow]] = await SpotifyCacheAccess.get_artists_by_ids_async(ids)
        cached_rows: List[CacheArtistRow] = a_result_cached.result() if a_result_cached.is_ok() else []
        cached_ids = {row.id for row in cached_rows}
        cached_artists: List[RawSpotifyApiArtist] = [RawSpotifyApiArtist.from_dict(row.json) for row in cached_rows]

        missing_ids: List[str] = [id for id in ids if id not in cached_ids]

        fresh_artists: List[RawSpotifyApiArtist] = []
        max_data_per_call = 50

        for i in range(math.ceil(len(missing_ids) / max_data_per_call) if missing_ids else 0):
            batch = missing_ids[i * max_data_per_call:(i + 1) * max_data_per_call]
            a_result_response = self.api_call(
                path="artists", params={"ids": ",".join(batch)})

            if a_result_response.is_not_ok():
                logger.error(f"Error in get_artists_async api_call. {a_result_response.info()}")
                continue

            artists: List[Dict[str, Any]] = a_result_response.result()["artists"]

            for artist in artists:
                if artist is None:
                    continue
                artist_id = artist.get("id")
                if artist_id:
                    await SpotifyCacheAccess.add_artist_async(artist_id, artist)
                fresh_artists.append(RawSpotifyApiArtist.from_dict(artist))

        return AResult(AResultCode.OK, message="OK", result=cached_artists + fresh_artists)

    async def get_playlist_async(self, id: str) -> AResult[RawSpotifyApiPlaylist]:
        # Cache-first
        a_result_cached = await SpotifyCacheAccess.get_playlist_async(id)
        if a_result_cached.is_ok():
            return AResult(code=AResultCode.OK, message="OK",
                           result=RawSpotifyApiPlaylist.from_dict(a_result_cached.result().json))

        a_result_response = self.api_call(path=f"playlists/{id}")
        if a_result_response.is_not_ok():
            logger.error(f"Error in get_playlist_async api_call. {a_result_response.info()}")
            return AResult(code=a_result_response.code(), message=a_result_response.message())

        playlist_json = a_result_response.result()
        await SpotifyCacheAccess.add_playlist_async(id, playlist_json)

        return AResult(code=AResultCode.OK, message="OK",
                       result=RawSpotifyApiPlaylist.from_dict(playlist_json))


spotify_api = SpotifyApi()
