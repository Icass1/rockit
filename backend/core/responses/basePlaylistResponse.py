from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongPlaylistResponse import BaseSongPlaylistResponse


class BasePlaylistResponse(BaseModel):
    provider: str
    publicId: str
    name: str
    songs: List[BaseSongPlaylistResponse]
    internalImageUrl: str
    owner: str
