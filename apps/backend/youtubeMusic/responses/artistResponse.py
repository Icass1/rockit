from collections.abc import Sequence

from core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class YoutubeMusicArtistResponse(BaseArtistResponse):
    youtubeId: str
    topSongs: Sequence[BaseSongWithAlbumResponse] = []
    albums: Sequence[BaseAlbumWithoutSongsResponse] = []
