from pydantic import BaseModel
from typing import List, Optional

from backend.constants import BACKEND_URL
from backend.db.ormModels.main.playlist import PlaylistRow
from backend.responses.general.externalImage import RockItExternalImageResponse
from backend.responses.general.songWithAlbum import RockItSongWithAlbumResponse


class RockItPlaylistResponse(BaseModel):
    publicId: str
    name: str
    externalImages: List[RockItExternalImageResponse]
    internalImageUrl: Optional[str]
    songs: List[RockItSongWithAlbumResponse]

    @staticmethod
    def from_row(playlist: PlaylistRow) -> "RockItPlaylistResponse":
        return RockItPlaylistResponse(
            publicId=playlist.public_id,
            name=playlist.name,
            externalImages=[RockItExternalImageResponse.from_row(
                image) for image in playlist.external_images],
            internalImageUrl=f"{BACKEND_URL}/image/{playlist.internal_image.public_id}" if playlist.internal_image else None,
            songs=[RockItSongWithAlbumResponse.from_row(song) for song in playlist.songs]
        )
