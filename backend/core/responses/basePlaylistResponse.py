from typing import Generic, List, Literal, Optional, Sequence, TypeVar, Union
from datetime import datetime

from pydantic import BaseModel, field_serializer

from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse

T = TypeVar("T")


class PlaylistContributorResponse(BaseModel):
    user_id: int
    role: PlaylistContributorRoleEnum

    @field_serializer("role")
    def serialize_queue_type(self, role: PlaylistContributorRoleEnum) -> str:
        return role.name


class PlaylistResponseItem(BaseModel, Generic[T]):
    item: T
    addedAt: datetime


class BasePlaylistResponse(BaseModel):
    type: Literal["playlist"] = "playlist"
    description: Optional[str]
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    medias: Sequence[
        Union[
            PlaylistResponseItem[BaseSongWithAlbumResponse],
            PlaylistResponseItem[BaseVideoResponse],
            PlaylistResponseItem[BaseStationResponse],
            PlaylistResponseItem[BasePlaylistForPlaylistResponse],
            PlaylistResponseItem[BaseAlbumWithoutSongsResponse],
        ]
    ]
    contributors: List[PlaylistContributorResponse]
    imageUrl: str
    owner: str
