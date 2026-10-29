from pydantic import BaseModel

from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class LibrarySongSearchResponse(BaseModel):
    songs: list[BaseSongWithAlbumResponse]
    total: int
    offset: int
    limit: int
    hasMore: bool
