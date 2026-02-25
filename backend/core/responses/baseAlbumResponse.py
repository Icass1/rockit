from typing import Sequence

from pydantic import BaseModel

from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongResponse import BaseSongResponse


class BaseAlbumResponse(BaseModel):
    provider: str
    publicId: str
    name: str
    artists: Sequence[BaseArtistResponse]
    songs: Sequence[BaseSongResponse]
    releaseDate: str
    internalImageUrl: str