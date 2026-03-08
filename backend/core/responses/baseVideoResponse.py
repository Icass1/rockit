from typing import Optional, List
from pydantic import BaseModel

from backend.core.responses.baseArtistResponse import BaseArtistResponse


class BaseVideoResponse(BaseModel):
    """Base response model for video information."""

    provider: str
    publicId: str
    url: str
    name: str
    videoUrl: Optional[str] = None
    audioUrl: Optional[str] = None
    internalImageUrl: str
    duration: Optional[int]
    artists: List[BaseArtistResponse]
