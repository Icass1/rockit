import requests

from backend.core.aResult import AResult, AResultCode
from backend.constants import YOUTUBE_API_KEY
from backend.utils.logger import getLogger

from backend.youtube.youtubeApiTypes.rawYoutubeApiVideo import RawYoutubeVideo
from backend.youtube.youtubeApiTypes.rawYoutubeApiChannel import RawYoutubeChannel


logger = getLogger(__name__)


class YoutubeApi:
    def __init__(self) -> None:
        self.api_key: str = YOUTUBE_API_KEY
        self.base_url: str = "https://www.googleapis.com/youtube/v3"

    def _get_params(self, params: dict) -> dict:
        result: dict = {"key": self.api_key}
        result.update(params)
        return result

    async def get_video_async(self, video_id: str) -> AResult[RawYoutubeVideo]:
        try:
            url: str = f"{self.base_url}/videos"
            params: dict = self._get_params({
                "part": "snippet,contentDetails,statistics",
                "id": video_id
            })
            response: requests.Response = requests.get(url, params=params, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"YouTube API error: {response.status_code} - {response.text}")
                return AResult(code=AResultCode.GENERAL_ERROR, message=f"YouTube API error: {response.status_code}")
            
            data: dict = response.json()
            
            if "error" in data:
                logger.error(f"YouTube API error: {data['error']}")
                return AResult(code=AResultCode.GENERAL_ERROR, message=data["error"].get("message", "Unknown error"))
            
            items: list = data.get("items", [])
            if not items:
                return AResult(code=AResultCode.NOT_FOUND, message="Video not found on YouTube")
            
            return AResult(code=AResultCode.OK, message="OK", result=RawYoutubeVideo.from_dict(items[0]))
            
        except Exception as e:
            logger.error(f"Failed to get video from YouTube API: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message=f"Failed to get video: {e}")

    async def get_channel_async(self, channel_id: str) -> AResult[RawYoutubeChannel]:
        try:
            url: str = f"{self.base_url}/channels"
            params: dict = self._get_params({
                "part": "snippet,statistics",
                "id": channel_id
            })
            response: requests.Response = requests.get(url, params=params, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"YouTube API error: {response.status_code} - {response.text}")
                return AResult(code=AResultCode.GENERAL_ERROR, message=f"YouTube API error: {response.status_code}")
            
            data: dict = response.json()
            
            if "error" in data:
                logger.error(f"YouTube API error: {data['error']}")
                return AResult(code=AResultCode.GENERAL_ERROR, message=data["error"].get("message", "Unknown error"))
            
            items: list = data.get("items", [])
            if not items:
                return AResult(code=AResultCode.NOT_FOUND, message="Channel not found on YouTube")
            
            return AResult(code=AResultCode.OK, message="OK", result=RawYoutubeChannel.from_dict(items[0]))
            
        except Exception as e:
            logger.error(f"Failed to get channel from YouTube API: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message=f"Failed to get channel: {e}")


youtube_api = YoutubeApi()
