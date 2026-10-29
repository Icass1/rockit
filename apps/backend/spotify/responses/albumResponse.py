from collections.abc import Sequence

from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from spotify.responses.externalImageResponse import SpotifyExternalImageResponse


class SpotifyAlbumResponse(BaseAlbumWithSongsResponse):
    spotifyId: str
    externalImages: Sequence[SpotifyExternalImageResponse]
