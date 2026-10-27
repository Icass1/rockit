from datetime import datetime
from typing import TypeVar

from core.baseModel import BaseModel
from core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse

T = TypeVar("T")


class LibraryResponseItem[T](BaseModel):
    item: T
    addedAt: datetime


LibraryMediaItem = (
    LibraryResponseItem[BaseAlbumWithoutSongsResponse]
    | LibraryResponseItem[BasePlaylistWithoutMediasResponse]
    | LibraryResponseItem[BaseSongWithAlbumResponse]
    | LibraryResponseItem[BaseVideoResponse]
    | LibraryResponseItem[BaseStationResponse]
)
