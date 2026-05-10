from typing import Sequence, Union


from backend.core.types.playlistMediaTypes import (
    PlaylistResponseItem,
)

from backend.core.responses.baseAlbumWithSongsResponse import (
    BaseAlbumWithSongsResponse,
)
from backend.core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)


class BasePlaylistWithMediasResponse(BasePlaylistWithoutMediasResponse):
    medias: Sequence[
        Union[
            PlaylistResponseItem[BaseSongWithAlbumResponse],
            PlaylistResponseItem[BaseVideoResponse],
            PlaylistResponseItem[BaseStationResponse],
            PlaylistResponseItem[BasePlaylistForPlaylistResponse],
            PlaylistResponseItem[BaseAlbumWithSongsResponse],
        ]
    ]
