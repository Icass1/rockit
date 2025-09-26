from typing import List
from pydantic import BaseModel

from backend.responses.general.album import RockItAlbumResponse
from backend.responses.general.artist import RockItArtistResponse
from backend.responses.general.song import RockItSongResponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults


class SpotifyResults(BaseModel):
    songs: List[RockItSongResponse]
    albums: List[RockItAlbumResponse]
    artists: List[RockItArtistResponse]

    @staticmethod
    def from_spotify_search(spotify_search: RawSpotifyApiSearchResults) -> "SpotifyResults":

        songs: List[RockItSongResponse] = []
        albums: List[RockItAlbumResponse] = []
        artists: List[RockItArtistResponse] = []

        for track in spotify_search.tracks.items:
            songs.append(
                RockItSongResponse.from_spotify_api_search_results(track))

        for album in spotify_search.albums.items:
            albums.append(
                RockItAlbumResponse.from_spotify_api_search_results(album))

        for artist in spotify_search.artists.items:
            artists.append(
                RockItArtistResponse.from_spotify_api_search_results(artist))

        return SpotifyResults(
            songs=songs,
            albums=albums,
            artists=[]
        )


class SearchResponse(BaseModel):
    spotifyResults: SpotifyResults
