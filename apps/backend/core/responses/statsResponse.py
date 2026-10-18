from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class StatsResponse(BaseModel):
    songs: List[BaseSongWithAlbumResponse]
