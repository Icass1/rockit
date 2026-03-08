from typing import List
from pydantic import BaseModel

from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)
from backend.core.responses.baseVideoResponse import BaseVideoResponse


class LibraryListsResponse(BaseModel):
    albums: List[BaseAlbumWithoutSongsResponse]
    playlists: List[BasePlaylistResponse]
    songs: List[BaseSongWithoutAlbumResponse]
    videos: List[BaseVideoResponse]
    stations: List[BaseSongWithoutAlbumResponse]
