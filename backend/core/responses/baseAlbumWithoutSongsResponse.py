from typing import Literal, Sequence

from pydantic import BaseModel

from backend.core.responses.baseArtistResponse import BaseArtistResponse


class BaseAlbumWithoutSongsResponse(BaseModel):
    """Base response model for a song's album information."""

    type: Literal["album"] = "album"
    provider: str
    publicId: str
    name: str
    artists: Sequence[BaseArtistResponse]
    releaseDate: str
    internalImageUrl: str
