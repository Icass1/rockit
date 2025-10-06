import os
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

from backend.constants import SONGS_PATH
from backend.db.ormModels.song import SongRow
from backend.responses.general.artist import RockItArtistResponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsItems


class RockItSongWithoutAlbumResponse(BaseModel):
    publicId: str
    name: str
    artists: List[RockItArtistResponse]
    duration: int
    trackNumber: int
    discNumber: int
    internalImageUrl: Optional[str]
    downloadUrl: Optional[str]
    downloaded: bool
    popularity: Optional[int]
    dateAdded: datetime
    isrc: str
    audioUrl: Optional[str]

    @staticmethod
    def from_spotify_api_search_results(track: SpotifySearchResultsItems):
        return RockItSongWithoutAlbumResponse(
            publicId=track.id,
            name=track.name,
            artists=[RockItArtistResponse.from_spotify_api_search_results(
                artist) for artist in track.artists],
            duration=int(track.duration_ms/1000),
            trackNumber=track.track_number,
            discNumber=track.disc_number,
            internalImageUrl=None,
            downloadUrl=None,
            popularity=track.popularity,
            dateAdded=datetime.now(),
            isrc=track.external_ids.isrc,
            downloaded=False,
            audioUrl=None
        )

    @staticmethod
    def from_row(song: SongRow) -> "RockItSongWithoutAlbumResponse":
        downloaded = song.path != None and os.path.exists(
            os.path.join(SONGS_PATH, song.path))
        return RockItSongWithoutAlbumResponse(
            publicId=song.public_id,
            name=song.name,
            artists=[
                RockItArtistResponse.from_row(
                    artist) for artist in song.artists
            ],
            duration=song.duration,
            trackNumber=song.track_number,
            discNumber=song.disc_number,
            internalImageUrl=f"http://localhost:8000/image/{song.internal_image.public_id}" if song.internal_image else None,
            downloadUrl=song.download_url,
            popularity=song.popularity,
            dateAdded=song.date_added,
            isrc=song.isrc,
            downloaded=downloaded,
            audioUrl=f"http://localhost:8000/audio/{song.public_id}" if downloaded else None
        )
