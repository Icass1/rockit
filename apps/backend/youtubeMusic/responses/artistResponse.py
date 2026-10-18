from typing import Sequence

from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)


class YoutubeMusicArtistResponse(BaseArtistResponse):
    youtubeId: str
    topSongs: Sequence[BaseSongWithAlbumResponse] = []
    albums: Sequence[BaseAlbumWithoutSongsResponse] = []
