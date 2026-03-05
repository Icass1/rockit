from typing import Optional

from pydantic import BaseModel


class BaseVideoResponse(BaseModel):
    """Base response model for video information."""

    provider: str
    publicId: str
    name: str
    videoUrl: Optional[str] = None
    audioUrl: Optional[str] = None
    internalImageUrl: str
    duration: Optional[int]
