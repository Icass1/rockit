from collections.abc import Sequence

from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from spotifyScrapper.responses.externalImageResponse import (
    SpotifyScrapperExternalImageResponse,
)


class SpotifyScrapperAlbumResponse(BaseAlbumWithSongsResponse):
    spotifyId: str
    externalImages: Sequence[SpotifyScrapperExternalImageResponse]
