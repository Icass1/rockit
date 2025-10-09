from typing import List
from pydantic import BaseModel

from backend.db.ormModels.main.album import AlbumRow
from backend.responses.general.albumWithoutSongs import RockItAlbumWithoutSongsResponse
from backend.responses.general.artist import RockItArtistResponse
from backend.responses.general.copyright import RockItCopyrightResponse
from backend.responses.general.externalImage import RockItExternalImageResponse
from backend.responses.general.songWithoutAlbum import RockItSongWithoutAlbumResponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsAlbum, SpotifySearchResultsItems2


class RockItAlbumWithSongsResponse(RockItAlbumWithoutSongsResponse):
    songs: List[RockItSongWithoutAlbumResponse]

    @staticmethod
    def from_spotify_api_search_results(album: SpotifySearchResultsItems2 | SpotifySearchResultsAlbum) -> "RockItAlbumWithSongsResponse":
        raise NotImplementedError()

    @staticmethod
    def from_row(album: AlbumRow) -> "RockItAlbumWithSongsResponse":
        return RockItAlbumWithSongsResponse(
            publicId=album.public_id,
            name=album.name,
            copyrights=[
                RockItCopyrightResponse(
                    text=copyright.text,
                    type=copyright.type
                ) for copyright in album.copyrights
            ],
            externalImages=[
                RockItExternalImageResponse.from_row(
                    image) for image in album.external_images],
            artists=[
                RockItArtistResponse.from_row(
                    artist) for artist in album.artists
            ],
            songs=[
                RockItSongWithoutAlbumResponse.from_row(
                    song) for song in album.songs
            ],
            internalImageUrl=f"{BACKEND_URL}/image/{album.internal_image.public_id}" if album.internal_image else None,
            releaseDate=album.release_date,
        )


# class RockItAlbumWithSongsResponse(BaseModel):
#     publicId: str
#     name: str
#     copyrights: List[RockItCopyrightResponse]
#     externalImages: List[RockItExternalImageResponse]
#     artists: List[RockItArtistResponse]
#     songs: List[RockItSongWithoutAlbumResponse]

#     @staticmethod
#     def from_spotify_api_search_results(album: SpotifySearchResultsItems2 | SpotifySearchResultsAlbum) -> "RockItAlbumWithSongsResponse":
#         raise NotImplementedError()

#     @staticmethod
#     def from_row(album: AlbumRow) -> "RockItAlbumWithSongsResponse":
#         return RockItAlbumWithSongsResponse(
#             publicId=album.public_id,
#             name=album.name,
#             copyrights=[],
#             externalImages=[RockItExternalImageResponse.from_row(
#                 image) for image in album.external_images],
#             artists=[RockItArtistResponse.from_row(
#                 artist) for artist in album.artists],
#             songs=[RockItSongWithoutAlbumResponse.from_row(
#                 song) for song in album.songs]
#         )
