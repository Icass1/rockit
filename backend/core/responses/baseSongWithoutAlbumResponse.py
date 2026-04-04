from typing import Sequence, Literal
from pydantic import BaseModel

from backend.core.responses.baseArtistResponse import BaseArtistResponse


class BaseSongWithoutAlbumResponse(BaseModel):
    """Base response model for an album's song information."""

    type: Literal["song"] = "song"
    provider: str
    publicId: str
    url: str
    name: str
    artists: Sequence[BaseArtistResponse]
    audioSrc: str | None
    downloaded: bool
    imageUrl: str
    duration_ms: int
    discNumber: int
    trackNumber: int
