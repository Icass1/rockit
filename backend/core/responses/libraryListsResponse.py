from typing import List
from pydantic import BaseModel

from backend.core.responses.baseAlbumResponse import BaseAlbumResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse


class LibraryListsResponse(BaseModel):
    albums: List[BaseAlbumResponse]
    playlists: List[BasePlaylistResponse]
