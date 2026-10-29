from pydantic import BaseModel

from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class StatsResponse(BaseModel):
    songs: list[BaseSongWithAlbumResponse]
