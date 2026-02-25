from typing import Sequence

from backend.core.responses.baseSongAlbumResponse import BaseSongAlbumResponse
from backend.core.responses.baseSongResponse import BaseSongResponse


class BaseAlbumResponse(BaseSongAlbumResponse):
    songs: Sequence[BaseSongResponse]
