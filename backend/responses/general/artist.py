from typing import List
from pydantic import BaseModel

from backend.responses.general.externalImage import RockItExternalImageResponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsArtists, SpotifySearchResultsArtists1, SpotifySearchResultsArtists3, SpotifySearchResultsItems1


class RockItArtistResponse(BaseModel):
    publicId: str
    name: str
    genres: List[str]
    externalImages: List[RockItExternalImageResponse]

    @staticmethod
    def from_spotify_api_search_results(artist: SpotifySearchResultsArtists | SpotifySearchResultsArtists1 | SpotifySearchResultsArtists3 | SpotifySearchResultsItems1) -> "RockItArtistResponse":
        return RockItArtistResponse(
            publicId=artist.id,
            name=artist.name,
            genres=artist.genres if isinstance(
                artist, SpotifySearchResultsItems1) else [],
            externalImages=[RockItExternalImageResponse.from_spotify_api_search_results(
                image) for image in artist.images] if isinstance(artist, SpotifySearchResultsItems1) and artist.images else []
        )
