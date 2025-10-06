import os
from datetime import datetime

from backend.constants import SONGS_PATH
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
            isrc=track.external_ids.isrc,
            downloaded=False,
            audioUrl=None
        )

    @staticmethod
    def from_row(song: SongRow) -> "RockItSongWithAlbumResponse":
        downloaded = song.path != None and os.path.exists(
            os.path.join(SONGS_PATH, song.path))
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
            internalImageUrl=f"http://localhost:8000/image/{song.internal_image.public_id}" if song.internal_image else None,
            downloadUrl=song.download_url,
            popularity=song.popularity,
            dateAdded=song.date_added,
            isrc=song.isrc,
            downloaded=downloaded,
            audioUrl=f"http://localhost:8000/audio/{song.public_id}" if downloaded else None,
            album=RockItAlbumWithoutSongsResponse.from_row(song.album)
        )
