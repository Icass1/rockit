from logging import Logger
from typing import List, Any

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.responses.searchResponse import (
    ArtistSearchResultsItem,
    BaseSearchResultsItem,
)

from backend.youtube.framework.youtube import YouTube
from backend.youtube.framework.youtubeApi import RawYoutubeSearchResult, youtube_api

logger: Logger = getLogger(__name__)


class YoutubeProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        YouTube.provider_name = provider_name
        YouTube.provider = self

        self._id = provider_id
        self._name = provider_name

    async def search_async(self, query: str) -> AResult[List[BaseSearchResultsItem]]:

        a_result: AResult[List[RawYoutubeSearchResult]] = (
            await youtube_api.search_videos_async(query=query, max_results=10)
        )
        if a_result.is_not_ok():
            logger.error(f"YouTube search error: {a_result.info()}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="OK")

        videos: List[RawYoutubeSearchResult] = a_result.result()
        result: List[BaseSearchResultsItem] = [
            BaseSearchResultsItem(
                type="video",
                title=v.title or "",
                url=f"/youtube/video/{v.video_id}",
                imageUrl=self._get_thumbnail_url(v.thumbnails),
                artists=[
                    ArtistSearchResultsItem(
                        name=v.channel_title or "",
                        url=f"/youtube/chanel/{v.channel_id}",
                    )
                ],
                provider="Youtube",
            )
            for v in videos
        ]

        return AResult(code=AResultCode.OK, message="OK", result=result)

    def _get_thumbnail_url(self, thumbnails: Any) -> str:
        if not thumbnails:
            return ""
        thumb_dict: dict[str, Any] = thumbnails
        medium = thumb_dict.get("medium", {})
        high = thumb_dict.get("high", {})
        default = thumb_dict.get("default", {})
        return str(medium.get("url") or high.get("url") or default.get("url") or "")


provider = YoutubeProvider()
name = "YouTube"
