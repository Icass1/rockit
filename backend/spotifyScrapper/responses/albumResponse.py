from typing import Sequence
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.spotifyScrapper.responses.externalImageResponse import (
    SpotifyScrapperExternalImageResponse,
)


class SpotifyScrapperAlbumResponse(BaseAlbumWithSongsResponse):
    spotifyId: str
    externalImages: Sequence[SpotifyScrapperExternalImageResponse]
