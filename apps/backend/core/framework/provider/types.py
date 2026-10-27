from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse

AddFromUrlResult = (
    BaseSongWithAlbumResponse
    | BaseVideoResponse
    | BaseStationResponse
    | BasePlaylistWithoutMediasResponse
    | BasePlaylistWithMediasResponse
    | BaseAlbumWithSongsResponse
    | BaseArtistResponse
)
