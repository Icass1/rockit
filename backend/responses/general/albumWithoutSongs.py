from typing import List
from pydantic import BaseModel

from backend.db.ormModels.album import AlbumRow
from backend.responses.general.artist import RockItArtistResponse
from backend.responses.general.copyright import RockItCopyrightResponse
from backend.responses.general.externalImage import RockItExternalImageResponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsAlbum, SpotifySearchResultsItems2


class RockItAlbumWithoutSongsResponse(BaseModel):
    publicId: str
    name: str
    internalImageUrl: str | None
    copyrights: List[RockItCopyrightResponse]
    externalImages: List[RockItExternalImageResponse]
    artists: List[RockItArtistResponse]

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
            internalImageUrl=None
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
            internalImageUrl=f"http://localhost:8000/image/{album.internal_image.public_id}" if album.internal_image else None
        )
