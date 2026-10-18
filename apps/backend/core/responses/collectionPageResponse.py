from backend.core.types.playlistMediaTypes import PlaylistResponseItem
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.baseModel import BaseModel


class CollectionPageResponse(BaseModel):
    collection: BasePlaylistWithMediasResponse | BaseAlbumWithSongsResponse
    items: list[
        PlaylistResponseItem[BaseSongWithAlbumResponse]
        | PlaylistResponseItem[BaseVideoResponse]
        | PlaylistResponseItem[BaseStationResponse]
        | PlaylistResponseItem[BasePlaylistForPlaylistResponse]
        | PlaylistResponseItem[BaseAlbumWithSongsResponse]
    ]
    offset: int
    limit: int
    total: int
    hasMore: bool
