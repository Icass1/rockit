from datetime import datetime
from typing import List, Literal, Optional, TypeVar

from pydantic import BaseModel

from backend.core.types.playlistContributor import PlaylistContributor
from backend.core.responses.baseArtistResponse import BaseArtistResponse

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
    owner: BaseArtistResponse
    dateAdded: datetime | None = None
