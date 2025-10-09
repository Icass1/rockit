from logging import Logger

from fastapi import APIRouter

from backend.responses.rockItAlbumWithSongsResponse import RockItAlbumWithSongsResponse

from backend.responses.rockItPlaylistResponse import RockItPlaylistResponse
from backend.responses.rockItSongWithAlbumResponse import RockItSongWithAlbumResponse
from backend.utils.fastAPIRoute import fast_api_route
from backend.utils.logger import getLogger

from backend.init import downloader


router = APIRouter(prefix="/spotify")
logger: Logger = getLogger(__name__)


@fast_api_route(app=router, path="/album/{album_public_id}")
def get_spotify_album(album_public_id: str) -> RockItAlbumWithSongsResponse:
    """TODO"""
    return RockItAlbumWithSongsResponse.from_row(album=downloader.spotify.get_album(public_id=album_public_id))


@fast_api_route(app=router, path="/song/{song_public_id}")
def get_spotify_song(song_public_id: str) -> RockItSongWithAlbumResponse:
    """TODO"""
    return RockItSongWithAlbumResponse.from_row(song=downloader.spotify.get_song(public_id=song_public_id))


@fast_api_route(app=router, path="/playlist/{playlist_public_id}")
def get_spotify_playlist(playlist_public_id: str, update: str | None = None) -> RockItPlaylistResponse:
    """TODO"""
    print(update)
    return RockItPlaylistResponse.from_row(playlist=downloader.spotify.get_playlist(public_id=playlist_public_id, update=False))
