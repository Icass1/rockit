from collections.abc import Sequence

from core.responses.baseArtistResponse import BaseArtistResponse


class SpotifyScrapperArtistResponse(BaseArtistResponse):
    genres: Sequence[str]
