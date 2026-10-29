from core.responses.baseVideoResponse import BaseVideoResponse
from youtube.responses.channelResponse import YoutubeChannelResponse


class YoutubeVideoResponse(BaseVideoResponse):
    youtubeId: str
    viewCount: int
    likeCount: int
    commentCount: int
    channel: YoutubeChannelResponse | None = None
    description: str | None = None
    youtubeUrl: str | None = None
    tags: list[str] = []
    publishedAt: str | None = None
    video_path: str | None = None
