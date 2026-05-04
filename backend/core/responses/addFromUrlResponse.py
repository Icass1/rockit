from pydantic import BaseModel

from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse


class AddFromUrlResponse(BaseModel):
    data: (
        BaseSongWithAlbumResponse
        | BaseVideoResponse
        | BasePlaylistResponse
        | BaseAlbumWithSongsResponse
        | BaseArtistResponse
    )
