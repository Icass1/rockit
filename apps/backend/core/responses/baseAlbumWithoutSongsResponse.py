from collections.abc import Sequence
from typing import Literal

from pydantic import BaseModel

from core.responses.baseArtistResponse import BaseArtistResponse


class BaseAlbumWithoutSongsResponse(BaseModel):
    """Base response model for a song's album information."""

    type: Literal["album"] = "album"
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    artists: Sequence[BaseArtistResponse]
    releaseDate: str
    imageUrl: str
    dominantColor: str
    undownloadedCount: int = 0
