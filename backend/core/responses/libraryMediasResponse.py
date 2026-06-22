from typing import List, TypeVar

from pydantic import BaseModel

from backend.core.types.libraryMediaTypes import LibraryResponseItem

from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)

T = TypeVar("T")


class LibraryMediasResponse(BaseModel):
    albums: List[LibraryResponseItem[BaseAlbumWithoutSongsResponse]]
    playlists: List[LibraryResponseItem[BasePlaylistWithoutMediasResponse]]
    songs: List[LibraryResponseItem[BaseSongWithAlbumResponse]]
    videos: List[LibraryResponseItem[BaseVideoResponse]]
    stations: List[LibraryResponseItem[BaseStationResponse]]
    shared: List[LibraryResponseItem[BasePlaylistWithoutMediasResponse]]
