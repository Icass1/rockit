import os
from datetime import datetime

from backend.db.ormModels.main.song import SongRow
from backend.constants import BACKEND_URL, SONGS_PATH

from backend.responses.general.artist import RockItArtistResponse
from backend.responses.general.albumWithoutSongs import RockItAlbumWithoutSongsResponse
from backend.responses.general.songWithoutAlbum import RockItSongWithoutAlbumResponse

from backend.spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsItems


class RockItSongWithAlbumResponse(RockItSongWithoutAlbumResponse):
    album: RockItAlbumWithoutSongsResponse

    @staticmethod
    def from_spotify_api_search_results(track: SpotifySearchResultsItems) -> "RockItSongWithAlbumResponse":
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
            isrc=track.external_ids.isrc,
            downloaded=False,
            audioUrl=None
        )

    @staticmethod
    def from_row(song: SongRow) -> "RockItSongWithAlbumResponse":
        downloaded: bool = song.path != None and os.path.exists(
            path=os.path.join(SONGS_PATH, song.path))
        return RockItSongWithAlbumResponse(
            publicId=song.public_id,
            name=song.name,
            artists=[
                RockItArtistResponse.from_row(
                    artist) for artist in song.artists
            ],
            duration=song.duration,
            trackNumber=song.track_number,
            discNumber=song.disc_number,
            internalImageUrl=f"{BACKEND_URL}/image/{song.internal_image.public_id}" if song.internal_image else None,
            downloadUrl=song.download_url,
            popularity=song.popularity,
            dateAdded=song.date_added,
            isrc=song.isrc,
            downloaded=downloaded,
            audioUrl=f"{BACKEND_URL}/audio/{song.public_id}" if downloaded else None,
            album=RockItAlbumWithoutSongsResponse.from_row(song.album)
        )
