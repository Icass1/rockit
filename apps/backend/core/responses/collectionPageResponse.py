from core.baseModel import BaseModel
from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.types.playlistMediaTypes import PlaylistResponseItem


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
