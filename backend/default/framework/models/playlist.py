from dataclasses import dataclass
from typing import List

from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum


@dataclass
class PlaylistModel:
    id: int
    public_id: str
    name: str
    description: str | None
    cover_image: str
    is_public: bool
    owner_id: int
    date_added: str
    date_updated: str


@dataclass
class PlaylistMediaModel:
    id: int
    position: int
    media_type: MediaTypeEnum
    media_id: str
    provider_id: int


@dataclass
class PlaylistContributorModel:
    user_id: int
    role_key: int


@dataclass
class PlaylistWithDetailsModel:
    id: int
    public_id: str
    name: str
    description: str | None
    cover_image: str
    is_public: bool
    owner_id: int
    date_added: str
    date_updated: str
    medias: List[PlaylistMediaModel]
    contributors: List[PlaylistContributorModel]


@dataclass
class MediaInfoModel:
    media_type: MediaTypeEnum
    media_id: str
    provider_id: int


@dataclass
class PlaylistMediaAddModel:
    id: int
    position: int
    media_type: MediaTypeEnum
    media_id: str
    provider_id: int


@dataclass
class PlaylistContributorAddModel:
    user_id: int
    role: PlaylistContributorRoleEnum
