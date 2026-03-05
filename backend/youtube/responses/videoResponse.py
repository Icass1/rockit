from typing import Optional, List
from pydantic import BaseModel

from backend.youtube.responses.channelResponse import YoutubeChannelResponse


class YoutubeVideoResponse(BaseModel):
    provider: str
    publicId: str
    youtubeId: str
    name: str
    duration: int = 0
    viewCount: int = 0
    likeCount: int = 0
    commentCount: int = 0
    internalImageUrl: Optional[str] = None
    channel: Optional[YoutubeChannelResponse] = None
    description: Optional[str] = None
    youtubeUrl: Optional[str] = None
    tags: List[str] = []
    publishedAt: Optional[str] = None
    path: Optional[str] = None
