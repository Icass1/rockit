from typing import List
from pydantic import BaseModel

from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse


class LibraryListsResponse(BaseModel):
    albums: List[BaseAlbumWithSongsResponse]
    playlists: List[BasePlaylistResponse]
