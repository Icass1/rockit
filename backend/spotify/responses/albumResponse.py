from typing import Sequence
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.spotify.responses.externalImageResponse import ExternalImageResponse


class AlbumResponse(BaseAlbumWithSongsResponse):
    spotifyId: str
    externalImages: Sequence[ExternalImageResponse]
