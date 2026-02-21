import os
import math
import json
import base64
import requests
from typing import Any, Dict, List

from backend.core.aResult import AResult, AResultCode
from backend.constants import CLIENT_ID, CLIENT_SECRET
from backend.spotify.framework.spotifyCache import SpotifyCache
from backend.utils.logger import getLogger

from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum

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

        a_result: AResultCode = await SpotifyCache.get_albums_async()json=

        max_data_per_call = 20

        out_albums: List[RawSpotifyApiAlbum] = []

        for i in range(math.ceil(len(ids)/max_data_per_call)):
            a_result_response = self.api_call(
                path=f"albums", params={"ids": ",".join(ids[i*max_data_per_call:(i + 1)*max_data_per_call])})

            if a_result_response.is_not_ok():
                logger.error(f"Error in api_call. {a_result_response.info()}")
                continue

            albums: List[Dict[str, Any]] = a_result_response.result()["albums"]

            for album in albums:
                out_albums.append(RawSpotifyApiAlbum.from_dict(album))

        return AResult(AResultCode.OK, message="OK", result=out_albums)


spotify_api = SpotifyApi()
