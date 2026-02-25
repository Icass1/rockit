from typing import Sequence
from backend.core.responses.baseAlbumResponse import BaseAlbumResponse
from backend.spotify.responses.externalImageResponse import ExternalImageResponse


class AlbumResponse(BaseAlbumResponse):
    spotifyId: str
    externalImages: Sequence[ExternalImageResponse]
