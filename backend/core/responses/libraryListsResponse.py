from typing import List
from pydantic import BaseModel

from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)


class LibraryListsResponse(BaseModel):
    albums: List[BaseAlbumWithoutSongsResponse]
    playlists: List[BasePlaylistResponse]
