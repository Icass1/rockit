from core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)


class BaseSongWithAlbumResponse(BaseSongWithoutAlbumResponse):
    album: BaseAlbumWithoutSongsResponse
