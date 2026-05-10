from typing import Literal, Optional, Union, Sequence, List

from pydantic import BaseModel

from backend.core.types.playlistMediaTypes import PlaylistResponseItem
from backend.core.responses.baseAlbumWithSongsResponse import (
    BaseAlbumWithSongsResponse,
)
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.types.playlistContributor import PlaylistContributor


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
    description: Optional[str] = None
    itemCount: int = 0
    medias: Sequence[
        Union[
            PlaylistResponseItem[BaseSongWithAlbumResponse],
            PlaylistResponseItem[BaseVideoResponse],
            PlaylistResponseItem[BaseStationResponse],
            PlaylistResponseItem["BasePlaylistForPlaylistResponse"],
            PlaylistResponseItem[BaseAlbumWithSongsResponse],
        ]
    ]
    contributors: List[PlaylistContributor]
