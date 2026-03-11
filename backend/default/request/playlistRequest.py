from typing import Optional
from pydantic import BaseModel


class CreatePlaylistRequest(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True


class UpdatePlaylistRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    is_public: Optional[bool] = None


class AddMediaToPlaylistRequest(BaseModel):
    media_public_id: str


class AddContributorRequest(BaseModel):
    user_id: int
    role_key: int


class RemoveContributorRequest(BaseModel):
    user_id: int
