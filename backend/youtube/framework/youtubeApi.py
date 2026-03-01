import requests
from typing import Any, List
from pydantic import BaseModel

from backend.core.aResult import AResult, AResultCode
from backend.constants import YOUTUBE_API_KEY
from backend.utils.logger import getLogger

from backend.youtube.youtubeApiTypes.rawYoutubeApiVideo import RawYoutubeVideo
from backend.youtube.youtubeApiTypes.rawYoutubeApiChannel import RawYoutubeChannel

logger = getLogger(__name__)


class RawYoutubeSearchResult(BaseModel):
    kind: str | None = None
    etag: str | None = None
    video_id: str | None = None
    channel_id: str | None = None
    channel_title: str | None = None
    title: str | None = None
    description: str | None = None
    thumbnails: dict[str, Any] | None = None
    publish_time: str | None = None
    live_broadcast_content: str | None = None

    @classmethod
    def from_dict(cls, obj: dict[str, Any]) -> "RawYoutubeSearchResult":
        search_id: dict[str, Any] = obj.get("id", {})
        snippet: dict[str, Any] = obj.get("snippet", {})
        return cls(
            kind=obj.get("kind"),
            etag=obj.get("etag"),
            video_id=search_id.get("videoId"),
            channel_id=search_id.get("channelId"),
            channel_title=snippet.get("channelTitle"),
            title=snippet.get("title"),
            description=snippet.get("description"),
            thumbnails=snippet.get("thumbnails"),
            publish_time=snippet.get("publishTime"),
            live_broadcast_content=snippet.get("liveBroadcastContent"),
        )


class YoutubeApi:
    def __init__(self) -> None:
        self.api_key: str = YOUTUBE_API_KEY
        self.base_url: str = "https://www.googleapis.com/youtube/v3"

    def _get_params(self, params: dict[str, Any]) -> dict[str, Any]:
        result: dict[str, Any] = {"key": self.api_key}
        result.update(params)
        return result

    async def get_video_async(self, video_id: str) -> AResult[RawYoutubeVideo]:
        try:
            url: str = f"{self.base_url}/videos"
            params: dict[str, Any] = self._get_params(
                {"part": "snippet,contentDetails,statistics", "id": video_id}
            )
            response: requests.Response = requests.get(url, params=params, timeout=10)

            if response.status_code != 200:
                logger.error(
                    f"YouTube API error: {response.status_code} - {response.text}"
                )
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"YouTube API error: {response.status_code}",
                )

            data: dict[str, Any] = response.json()

            if "error" in data:
                logger.error(f"YouTube API error: {data['error']}")
                error_message: str = data["error"].get("message", "Unknown error")
                return AResult(code=AResultCode.GENERAL_ERROR, message=error_message)

            items: list[dict[str, Any]] = data.get("items", [])
            if not items:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Video not found on YouTube"
                )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=RawYoutubeVideo.from_dict(items[0]),
            )

        except Exception as e:
            logger.error(f"Failed to get video from YouTube API: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message=f"Failed to get video: {e}"
            )

    async def get_channel_async(self, channel_id: str) -> AResult[RawYoutubeChannel]:
        try:
            url: str = f"{self.base_url}/channels"
            params: dict[str, Any] = self._get_params(
                {"part": "snippet,statistics", "id": channel_id}
            )
            response: requests.Response = requests.get(url, params=params, timeout=10)

            if response.status_code != 200:
                logger.error(
                    f"YouTube API error: {response.status_code} - {response.text}"
                )
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"YouTube API error: {response.status_code}",
                )

            data: dict[str, Any] = response.json()

            if "error" in data:
                logger.error(f"YouTube API error: {data['error']}")
                error_message: str = data["error"].get("message", "Unknown error")
                return AResult(code=AResultCode.GENERAL_ERROR, message=error_message)

            items: list[dict[str, Any]] = data.get("items", [])
            if not items:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Channel not found on YouTube"
                )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=RawYoutubeChannel.from_dict(items[0]),
            )

        except Exception as e:
            logger.error(f"Failed to get channel from YouTube API: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message=f"Failed to get channel: {e}"
            )

    async def search_videos_async(
        self, query: str, max_results: int = 10, order_by: str = "relevance"
    ) -> AResult[List[RawYoutubeSearchResult]]:
        try:
            url: str = f"{self.base_url}/search"
            params: dict[str, Any] = self._get_params(
                {
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "maxResults": max_results,
                    "order": order_by,
                    "videoDuration": "medium",
                }
            )
            response: requests.Response = requests.get(url, params=params, timeout=10)

            if response.status_code != 200:
                logger.error(
                    f"YouTube Search API error: {response.status_code} - {response.text}"
                )
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"YouTube Search API error: {response.status_code}",
                )

            data: dict[str, Any] = response.json()

            if "error" in data:
                logger.error(f"YouTube Search API error: {data['error']}")
                error_message: str = data["error"].get("message", "Unknown error")
                return AResult(code=AResultCode.GENERAL_ERROR, message=error_message)

            items: list[dict[str, Any]] = data.get("items", [])
            if not items:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="No videos found on YouTube"
                )

            results: List[RawYoutubeSearchResult] = [
                RawYoutubeSearchResult.from_dict(item) for item in items
            ]

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=results,
            )

        except Exception as e:
            logger.error(f"Failed to search videos from YouTube API: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message=f"Failed to search videos: {e}"
            )


youtube_api = YoutubeApi()
