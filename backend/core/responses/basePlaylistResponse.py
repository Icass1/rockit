from typing import Literal, List
from pydantic import BaseModel

from backend.core.responses.baseSongForPlaylistResponse import (
    BaseSongForPlaylistResponse,
)


class BasePlaylistResponse(BaseModel):
    type: Literal["playlist"] = "playlist"
    provider: str
    publicId: str
    name: str
    songs: List[BaseSongForPlaylistResponse]
    internalImageUrl: str
    owner: str
