from collections.abc import Sequence
from typing import Literal

from pydantic import BaseModel

from core.responses.baseAlbumWithSongsResponse import (
    BaseAlbumWithSongsResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.types.playlistContributor import PlaylistContributor
from core.types.playlistMediaTypes import PlaylistResponseItem


class BasePlaylistForPlaylistResponse(BaseModel):
    """Lightweight playlist response for embedding in another playlist."""

    type: Literal["playlist"] = "playlist"
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    imageUrl: str
    owner: str
    description: str | None = None
    itemCount: int = 0
    medias: Sequence[
        PlaylistResponseItem[BaseSongWithAlbumResponse]
        | PlaylistResponseItem[BaseVideoResponse]
        | PlaylistResponseItem[BaseStationResponse]
        | PlaylistResponseItem["BasePlaylistForPlaylistResponse"]
        | PlaylistResponseItem[BaseAlbumWithSongsResponse]
    ]
    contributors: list[PlaylistContributor]
