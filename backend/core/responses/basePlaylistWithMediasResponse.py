from typing import Generic, Sequence, TypeVar, Union
from datetime import datetime

from pydantic import BaseModel

from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseAlbumWithSongsResponse import (
    BaseAlbumWithSongsResponse,
)
from backend.core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)

T = TypeVar("T")


class PlaylistResponseItem(BaseModel, Generic[T]):
    item: T
    addedAt: datetime


class BasePlaylistWithMediasResponse(BasePlaylistWithoutMediasResponse):
    medias: Sequence[
        Union[
            PlaylistResponseItem[BaseSongWithAlbumResponse],
            PlaylistResponseItem[BaseVideoResponse],
            PlaylistResponseItem[BaseStationResponse],
            PlaylistResponseItem[BasePlaylistForPlaylistResponse],
            PlaylistResponseItem[BaseAlbumWithoutSongsResponse],
            PlaylistResponseItem[BaseAlbumWithSongsResponse],
        ]
    ]
