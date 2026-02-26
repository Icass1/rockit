from typing import Sequence
from pydantic import BaseModel


class BaseArtistResponse(BaseModel):
    provider: str
    publicId: str
    name: str
    internalImageUrl: str
    genres: Sequence[str]
