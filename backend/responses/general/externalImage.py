from typing import List, Optional
from pydantic import BaseModel

from backend.db.ormModels.externalImage import ExternalImageRow
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsImages, SpotifySearchResultsImages1, SpotifySearchResultsImages2


class RockItExternalImageResponse(BaseModel):
    url: str
    width: Optional[int]
    height: Optional[int]

    @staticmethod
    def from_spotify_api_search_results(image: SpotifySearchResultsImages | SpotifySearchResultsImages1 | SpotifySearchResultsImages2) -> "RockItExternalImageResponse":
        return RockItExternalImageResponse(url=image.url, width=image.width, height=image.height)

    @staticmethod
    def from_row(external_image: ExternalImageRow) -> "RockItExternalImageResponse":
        return RockItExternalImageResponse(url=external_image.url, width=external_image.width, height=external_image.height)
