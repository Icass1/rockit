from pydantic import BaseModel


class YoutubeChannelResponse(BaseModel):
    provider: str
    publicId: str
    name: str
    imageUrl: str | None = None
    subscriberCount: int = 0
    videoCount: int = 0
    viewCount: int = 0
    description: str | None = None
