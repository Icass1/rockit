from typing import List
from pydantic import BaseModel

from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse


class LibraryMediasResponse(BaseModel):
    albums: List[BaseAlbumWithoutSongsResponse]
    playlists: List[BasePlaylistResponse]
    songs: List[BaseSongWithAlbumResponse]
    videos: List[BaseVideoResponse]
    stations: List[BaseStationResponse]
    shared: List[BasePlaylistResponse]
