from typing import Generic, TypeVar
from datetime import datetime

from backend.core.baseModel import BaseModel

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


class LibraryResponseItem(BaseModel, Generic[T]):
    item: T
    addedAt: datetime


LibraryMediaItem = (
    LibraryResponseItem[BaseAlbumWithoutSongsResponse]
    | LibraryResponseItem[BasePlaylistWithoutMediasResponse]
    | LibraryResponseItem[BaseSongWithAlbumResponse]
    | LibraryResponseItem[BaseVideoResponse]
    | LibraryResponseItem[BaseStationResponse]
)
