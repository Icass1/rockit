from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from backend.responses.general.album import RockItAlbumResponse
from backend.responses.general.artist import RockItArtistResponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsItems


class RockItSongResponse(BaseModel):
    publicId: str
    name: str
    artists: List[RockItArtistResponse]
    album: RockItAlbumResponse
    duration: int
    trackNumber: int
    discNumber: int
    internalImageUrl: Optional[str]
    downloadUrl: Optional[str]
    popularity: Optional[int]
    dateAdded: datetime
    isrc: str

    @staticmethod
    def from_spotify_api_search_results(track: SpotifySearchResultsItems):
        return RockItSongResponse(
            publicId=track.id,
            name=track.name,
            artists=[RockItArtistResponse.from_spotify_api_search_results(
                artist) for artist in track.artists],
            album=RockItAlbumResponse.from_spotify_api_search_results(
                track.album),
            duration=track.duration_ms,
            trackNumber=track.track_number,
            discNumber=track.disc_number,
            internalImageUrl=None,
            downloadUrl=None,
            popularity=track.popularity,
            dateAdded=datetime.now(),
            isrc=track.external_ids.isrc
        )
