from typing import Sequence

from backend.core.responses.baseArtistResponse import BaseArtistResponse


class SpotifyArtistResponse(BaseArtistResponse):
    genres: Sequence[str]
