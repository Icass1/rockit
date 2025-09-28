from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from backend.db.ormModels.song import SongRow
from backend.responses.general.albumWithoutSongs import RockItAlbumWithoutSongsResponse
from backend.responses.general.artist import RockItArtistResponse
from backend.responses.general.songWithoutAlbum import RockItSongWithoutAlbumResponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsItems


class RockItSongWithAlbumResponse(RockItSongWithoutAlbumResponse):
    album: RockItAlbumWithoutSongsResponse

    @staticmethod
    def from_spotify_api_search_results(track: SpotifySearchResultsItems):
        return RockItSongWithAlbumResponse(
            publicId=track.id,
            name=track.name,
            artists=[RockItArtistResponse.from_spotify_api_search_results(
                artist) for artist in track.artists],
            album=RockItAlbumWithoutSongsResponse.from_spotify_api_search_results(
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

    @staticmethod
    def from_row(song: SongRow) -> "RockItSongWithAlbumResponse":
        raise NotImplementedError()
