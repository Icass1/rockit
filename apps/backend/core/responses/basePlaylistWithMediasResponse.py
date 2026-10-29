from collections.abc import Sequence

from core.responses.baseAlbumWithSongsResponse import (
    BaseAlbumWithSongsResponse,
)
from core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.types.playlistMediaTypes import (
    PlaylistResponseItem,
)


class BasePlaylistWithMediasResponse(BasePlaylistWithoutMediasResponse):
    medias: Sequence[
        PlaylistResponseItem[BaseSongWithAlbumResponse]
        | PlaylistResponseItem[BaseVideoResponse]
        | PlaylistResponseItem[BaseStationResponse]
        | PlaylistResponseItem[BasePlaylistForPlaylistResponse]
        | PlaylistResponseItem[BaseAlbumWithSongsResponse]
    ]

    offset: int = 0
    limit: int = 100
    total: int = 0
    hasMore: bool = False
