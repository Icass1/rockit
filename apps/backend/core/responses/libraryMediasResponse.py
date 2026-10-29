from typing import TypeVar

from pydantic import BaseModel

from core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.types.libraryMediaTypes import LibraryResponseItem

T = TypeVar("T")


class LibraryMediasResponse(BaseModel):
    albums: list[LibraryResponseItem[BaseAlbumWithoutSongsResponse]]
    playlists: list[LibraryResponseItem[BasePlaylistWithoutMediasResponse]]
    songs: list[LibraryResponseItem[BaseSongWithAlbumResponse]]
    videos: list[LibraryResponseItem[BaseVideoResponse]]
    stations: list[LibraryResponseItem[BaseStationResponse]]
    shared: list[LibraryResponseItem[BasePlaylistWithoutMediasResponse]]
