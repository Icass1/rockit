from pydantic import BaseModel

from core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum


class AddContributorRequest(BaseModel):
    userPublicId: str
    role: PlaylistContributorRoleEnum
