from typing import List, Optional
from pydantic import BaseModel

from backend.constants import BACKEND_URL
from backend.db.ormModels.main.artist import ArtistRow
from backend.responses.rockItExternalImageResponse import RockItExternalImageResponse
from backend.spotifyApiTypes.rawSpotifyApiSearchResults import SpotifySearchResultsArtists, SpotifySearchResultsArtists1, SpotifySearchResultsArtists3, SpotifySearchResultsItems1


class RockItArtistResponse(BaseModel):
    publicId: str
    name: str
    genres: List[str]
    externalImages: List[RockItExternalImageResponse]
    internalImageUrl: Optional[str]

    @staticmethod
    def from_spotify_api_search_results(artist: SpotifySearchResultsArtists | SpotifySearchResultsArtists1 | SpotifySearchResultsArtists3 | SpotifySearchResultsItems1) -> "RockItArtistResponse":
        return RockItArtistResponse(
            publicId=artist.id,
            name=artist.name,
            genres=artist.genres if isinstance(
                artist, SpotifySearchResultsItems1) else [],
            externalImages=[RockItExternalImageResponse.from_spotify_api_search_results(
                image) for image in artist.images] if isinstance(artist, SpotifySearchResultsItems1) and artist.images else [],
            internalImageUrl=None

        )

    @staticmethod
    def from_row(artist: ArtistRow) -> "RockItArtistResponse":
        return RockItArtistResponse(
            publicId=artist.public_id,
            name=artist.name,
            genres=[g.name for g in artist.genres],
            externalImages=[RockItExternalImageResponse.from_row(
                image) for image in artist.external_images],
            internalImageUrl=f"{BACKEND_URL }/image/{artist.internal_image.public_id}" if artist.internal_image else None

        )
