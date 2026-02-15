from typing import List
from pydantic import BaseModel

from backend.constants import BACKEND_URL
from backend.db.ormModels.main.album import AlbumRow
from backend.responses.rockItArtistResponse import RockItArtistResponse
from backend.responses.rockItCopyrightResponse import RockItCopyrightResponse
from backend.responses.rockItExternalImageResponse import RockItExternalImageResponse
from backend.spotifyApiTypes.rawSpotifyApiSearchResults import SpotifySearchResultsAlbum, SpotifySearchResultsItems2


class RockItAlbumWithoutSongsResponse(BaseModel):
    publicId: str
    name: str
    internalImageUrl: str | None
    copyrights: List[RockItCopyrightResponse]
    externalImages: List[RockItExternalImageResponse]
    artists: List[RockItArtistResponse]
    releaseDate: str

    @staticmethod
    def from_spotify_api_search_results(album: SpotifySearchResultsItems2 | SpotifySearchResultsAlbum) -> "RockItAlbumWithoutSongsResponse":
        return RockItAlbumWithoutSongsResponse(
            publicId=album.id,
            name=album.name,
            copyrights=[],
            externalImages=[RockItExternalImageResponse.from_spotify_api_search_results(
                image) for image in album.images],
            artists=[RockItArtistResponse.from_spotify_api_search_results(
                artist) for artist in album.artists],
            internalImageUrl=None,
            releaseDate=album.release_date
        )

    @staticmethod
    def from_row(album: AlbumRow) -> "RockItAlbumWithoutSongsResponse":
        return RockItAlbumWithoutSongsResponse(
            publicId=album.public_id,
            name=album.name,
            copyrights=[],
            externalImages=[RockItExternalImageResponse.from_row(
                image) for image in album.external_images],
            artists=[RockItArtistResponse.from_row(
                artist) for artist in album.artists],
            internalImageUrl=f"{BACKEND_URL}/image/{album.internal_image.public_id}" if album.internal_image else None,
            releaseDate=album.release_date
        )
