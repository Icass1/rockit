from typing import Literal, Optional, List
from pydantic import BaseModel

from backend.core.responses.baseArtistResponse import BaseArtistResponse


class BaseVideoResponse(BaseModel):
    """Base response model for video information."""

    type: Literal["video"] = "video"
    provider: str
    publicId: str
    url: str
    name: str
    videoSrc: Optional[str] = None
    audioSrc: Optional[str] = None
    imageUrl: str
    duration_ms: int | None
    artists: List[BaseArtistResponse]
    downloaded: bool
