from typing import Sequence
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.spotify.responses.externalImageResponse import SpotifyExternalImageResponse


class SpotifyAlbumResponse(BaseAlbumWithSongsResponse):
    spotifyId: str
    externalImages: Sequence[SpotifyExternalImageResponse]
