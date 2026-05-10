from typing import TypeVar

from pydantic import BaseModel, field_serializer

from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum

T = TypeVar("T")


class PlaylistContributor(BaseModel):
    userPublicId: str
    username: str
    role: PlaylistContributorRoleEnum

    @field_serializer("role")
    def serialize_queue_type(self, role: PlaylistContributorRoleEnum) -> str:
        return role.name
