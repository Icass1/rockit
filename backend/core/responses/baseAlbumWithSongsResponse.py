from typing import Sequence

from backend.core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)


class BaseAlbumWithSongsResponse(BaseAlbumWithoutSongsResponse):
    songs: Sequence[BaseSongWithoutAlbumResponse]
