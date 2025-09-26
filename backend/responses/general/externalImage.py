from typing import List, Optional
from pydantic import BaseModel

from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsImages, SpotifySearchResultsImages1, SpotifySearchResultsImages2


class RockItExternalImageResponse(BaseModel):
    url: str
    width: Optional[int]
    height: Optional[int]

    @staticmethod
    def from_spotify_api_search_results(image: SpotifySearchResultsImages | SpotifySearchResultsImages1 | SpotifySearchResultsImages2) -> "RockItExternalImageResponse":
        return RockItExternalImageResponse(url=image.url, width=image.width, height=image.height)
