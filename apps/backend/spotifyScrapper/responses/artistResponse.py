from typing import Sequence

from backend.core.responses.baseArtistResponse import BaseArtistResponse


class SpotifyScrapperArtistResponse(BaseArtistResponse):
    genres: Sequence[str]
