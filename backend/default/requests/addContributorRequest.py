from pydantic import BaseModel

from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum


class AddContributorRequest(BaseModel):
    userPublicId: str
    role: PlaylistContributorRoleEnum
