from typing import Literal

from pydantic import BaseModel

from core.responses.baseArtistResponse import BaseArtistResponse


class BaseVideoResponse(BaseModel):
    """Base response model for video information."""

    type: Literal["video"] = "video"
    provider: str
    publicId: str
    providerUrl: str
    name: str
    videoUrl: str | None = None
    audioUrl: str | None = None
    imageUrl: str
    dominantColor: str
    duration_ms: int | None
    artists: list[BaseArtistResponse]
    downloaded: bool
