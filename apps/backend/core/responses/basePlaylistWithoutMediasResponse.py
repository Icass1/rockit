from typing import Literal, TypeVar

from pydantic import BaseModel

from core.responses.baseArtistResponse import BaseArtistResponse
from core.types.playlistContributor import PlaylistContributor

T = TypeVar("T")


class BasePlaylistWithoutMediasResponse(BaseModel):
    type: Literal["playlist"] = "playlist"
    description: str | None
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    contributors: list[PlaylistContributor]
    imageUrl: str
    owner: BaseArtistResponse
