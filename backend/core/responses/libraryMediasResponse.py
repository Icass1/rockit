from typing import List
from pydantic import BaseModel

from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)


class LibraryMediasResponse(BaseModel):
    albums: List[BaseAlbumWithoutSongsResponse]
    playlists: List[BasePlaylistWithoutMediasResponse]
    songs: List[BaseSongWithAlbumResponse]
    videos: List[BaseVideoResponse]
    stations: List[BaseStationResponse]
    shared: List[BasePlaylistWithoutMediasResponse]
