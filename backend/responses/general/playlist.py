from typing import List, Optional
from pydantic import BaseModel

from backend.db.ormModels.artist import ArtistRow
from backend.db.ormModels.playlist import PlaylistRow
from backend.responses.general.externalImage import RockItExternalImageResponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsArtists, SpotifySearchResultsArtists1, SpotifySearchResultsArtists3, SpotifySearchResultsItems1


class RockItPlaylistResponse(BaseModel):
    publicId: str
    name: str
    externalImages: List[RockItExternalImageResponse]
    internalImageUrl: Optional[str]

    @staticmethod
    def from_row(playlist: PlaylistRow) -> "RockItPlaylistResponse":
        return RockItPlaylistResponse(
            publicId=playlist.public_id,
            name=playlist.name,
            externalImages=[RockItExternalImageResponse.from_row(
                image) for image in playlist.external_images],
            internalImageUrl=f"http://localhost:8000/image/{playlist.internal_image.public_id}" if playlist.internal_image else None

        )
