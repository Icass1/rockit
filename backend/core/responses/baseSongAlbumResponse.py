from typing import Sequence

from pydantic import BaseModel

from backend.core.responses.baseArtistResponse import BaseArtistResponse


class BaseSongAlbumResponse(BaseModel):
    provider: str
    publicId: str
    name: str
    artists: Sequence[BaseArtistResponse]
    releaseDate: str
    internalImageUrl: str
