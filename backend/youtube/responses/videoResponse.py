from typing import Optional, List

from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.youtube.responses.channelResponse import YoutubeChannelResponse


class YoutubeVideoResponse(BaseVideoResponse):
    youtubeId: str
    viewCount: int
    likeCount: int
    commentCount: int
    channel: Optional[YoutubeChannelResponse] = None
    description: Optional[str] = None
    youtubeUrl: Optional[str] = None
    tags: List[str] = []
    publishedAt: Optional[str] = None
    path: Optional[str] = None
