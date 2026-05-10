from typing import List, Literal, Optional, TypeVar

from pydantic import BaseModel

from backend.core.types.playlistContributor import PlaylistContributor

T = TypeVar("T")


class BasePlaylistWithoutMediasResponse(BaseModel):
    type: Literal["playlist"] = "playlist"
    description: Optional[str]
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    contributors: List[PlaylistContributor]
    imageUrl: str
    owner: str
