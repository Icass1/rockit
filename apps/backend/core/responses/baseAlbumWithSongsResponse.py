from collections.abc import Sequence

from core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)


class BaseAlbumWithSongsResponse(BaseAlbumWithoutSongsResponse):
    songs: Sequence[BaseSongWithoutAlbumResponse]

    offset: int = 0
    limit: int = 100
    total: int = 0
    hasMore: bool = False
