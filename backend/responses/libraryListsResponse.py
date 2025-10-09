from typing import List
from pydantic import BaseModel

from backend.responses.rockItAlbumWithoutSongsResponse import RockItAlbumWithoutSongsResponse
from backend.responses.rockItPlaylistResponse import RockItPlaylistResponse


class LibraryListsResponse(BaseModel):
    albums: List[RockItAlbumWithoutSongsResponse]
    playlists: List[RockItPlaylistResponse]
