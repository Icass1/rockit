from typing import List, Optional
from pydantic import BaseModel


class PlaylistMediaResponse(BaseModel):
    id: int
    position: int
    media_type: str
    media_id: str
    provider_id: Optional[int] = None


class PlaylistContributorResponse(BaseModel):
    user_id: int
    role_key: int


class PlaylistResponse(BaseModel):
    id: int
    public_id: str
    name: str
    description: Optional[str] = None
    cover_image: str
    is_public: bool
    owner_id: int
    date_added: str
    date_updated: str
    medias: List[PlaylistMediaResponse] = []
    contributors: List[PlaylistContributorResponse] = []


class PlaylistListResponse(BaseModel):
    playlists: List[PlaylistResponse]
