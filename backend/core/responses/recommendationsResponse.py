from typing import Literal
from pydantic import BaseModel

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class RecommendationsResponse(BaseModel):
    songs: list[BaseSongWithAlbumResponse]
    provider: Literal["local", "listenbrainz"] = "local"
    externalStatus: Literal[
        "off", "disabled", "unavailable", "no_matches", "active"
    ] = "off"
