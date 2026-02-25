from typing import Optional
from pydantic import BaseModel


class ChannelResponse(BaseModel):
    provider: str
    publicId: str
    name: str
    internalImageUrl: Optional[str] = None
    subscriberCount: int = 0
    videoCount: int = 0
    viewCount: int = 0
    description: Optional[str] = None
