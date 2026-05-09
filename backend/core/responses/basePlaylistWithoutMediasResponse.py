from typing import List, Literal, Optional, TypeVar

from pydantic import BaseModel, field_serializer

from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum

T = TypeVar("T")


class PlaylistContributorResponse(BaseModel):
    user_id: int
    role: PlaylistContributorRoleEnum

    @field_serializer("role")
    def serialize_queue_type(self, role: PlaylistContributorRoleEnum) -> str:
        return role.name


class BasePlaylistWithoutMediasResponse(BaseModel):
    type: Literal["playlist"] = "playlist"
    description: Optional[str]
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    contributors: List[PlaylistContributorResponse]
    imageUrl: str
    owner: str
