from backend.core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)


class BaseSongWithAlbumResponse(BaseSongWithoutAlbumResponse):
    album: BaseAlbumWithoutSongsResponse
