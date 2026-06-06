from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)

AddFromUrlAResult = (
    BaseSongWithAlbumResponse
    | BaseVideoResponse
    | BaseStationResponse
    | BasePlaylistWithoutMediasResponse
    | BaseAlbumWithSongsResponse
    | BaseArtistResponse
)
