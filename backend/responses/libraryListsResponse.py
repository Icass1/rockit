from typing import List
from pydantic import BaseModel

from backend.responses.general.albumWithoutSongs import RockItAlbumWithoutSongsResponse
from backend.responses.general.playlist import RockItPlaylistResponse


class LibraryListsResponse(BaseModel):
    albums: List[RockItAlbumWithoutSongsResponse]
    playlists: List[RockItPlaylistResponse]
