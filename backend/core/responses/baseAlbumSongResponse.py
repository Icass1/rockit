from typing import Sequence
from pydantic import BaseModel

from backend.core.responses.baseArtistResponse import BaseArtistResponse


class BaseAlbumSongResponse(BaseModel):
    provider: str
    publicId: str
    name: str
    artists: Sequence[BaseArtistResponse]
    audioSrc: str | None
    downloaded: bool
    internalImageUrl: str
    duration: int
    discNumber: int
    trackNumber: int
