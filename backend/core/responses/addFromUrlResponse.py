from pydantic import BaseModel

from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseStationResponse import BaseStationResponse


class AddFromUrlResponse(BaseModel):
    data: (
        BaseSongWithAlbumResponse
        | BaseVideoResponse
        | BasePlaylistWithoutMediasResponse
        | BasePlaylistWithMediasResponse
        | BaseAlbumWithSongsResponse
        | BaseArtistResponse
        | BaseStationResponse
    )
