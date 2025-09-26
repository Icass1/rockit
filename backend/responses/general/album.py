from typing import List
from pydantic import BaseModel

from backend.responses.general.artist import RockItArtistResponse
from backend.responses.general.copyright import RockItCopyrightResponse
from backend.responses.general.externalImage import RockItExternalImageResponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsAlbum, SpotifySearchResultsItems2


class RockItAlbumResponse(BaseModel):
    publicId: str
    name: str
    copyrights: List[RockItCopyrightResponse]
    externalImages: List[RockItExternalImageResponse]
    artists: List[RockItArtistResponse]

    @staticmethod
    def from_spotify_api_search_results(album: SpotifySearchResultsItems2 | SpotifySearchResultsAlbum) -> "RockItAlbumResponse":
        return RockItAlbumResponse(
            publicId=album.id,
            name=album.name,
            copyrights=[],
            externalImages=[RockItExternalImageResponse.from_spotify_api_search_results(
                image) for image in album.images],
            artists=[RockItArtistResponse.from_spotify_api_search_results(
                artist) for artist in album.artists]
        )
