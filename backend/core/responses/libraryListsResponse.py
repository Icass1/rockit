from typing import List
from pydantic import BaseModel, Field

from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse


class LibraryListsResponse(BaseModel):
    albums: List[BaseAlbumWithoutSongsResponse] = Field(default_factory=list)
    playlists: List[BasePlaylistResponse] = Field(default_factory=list)
    songs: List[BaseSongWithAlbumResponse] = Field(default_factory=list)
    videos: List[BaseVideoResponse] = Field(default_factory=list)
    stations: List[BaseStationResponse] = Field(default_factory=list)
    shared: List[BasePlaylistResponse] = Field(default_factory=list)
