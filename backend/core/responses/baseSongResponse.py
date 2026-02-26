from backend.core.responses.baseAlbumSongResponse import BaseAlbumSongResponse
from backend.core.responses.baseSongAlbumResponse import BaseSongAlbumResponse


class BaseSongResponse(BaseAlbumSongResponse):
    album: BaseSongAlbumResponse
