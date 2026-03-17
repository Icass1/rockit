from typing import Optional
from pydantic import BaseModel

from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum


class CreatePlaylistRequest(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True


class UpdatePlaylistRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


class AddMediaToPlaylistRequest(BaseModel):
    playlist_media_public_id: str


class AddContributorRequest(BaseModel):
    user_public_id: str
    role: PlaylistContributorRoleEnum


class RemoveContributorRequest(BaseModel):
    target_user_public_id: str
