from collections.abc import Sequence

from core.responses.baseArtistResponse import BaseArtistResponse


class SpotifyArtistResponse(BaseArtistResponse):
    genres: Sequence[str]
