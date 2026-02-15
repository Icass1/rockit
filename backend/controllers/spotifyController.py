from fastapi import Depends, APIRouter
from logging import Logger

from backend.aResult import AResult
from backend.db.ormModels.main.playlist import PlaylistRow
from backend.db.ormModels.main.user import UserRow

from backend.init import downloader
from backend.utils.logger import getLogger
from backend.framework.user.user import User

from backend.responses.rockItPlaylistResponse import RockItPlaylistResponse
from backend.responses.rockItSongWithAlbumResponse import RockItSongWithAlbumResponse
from backend.responses.rockItAlbumWithSongsResponse import RockItAlbumWithSongsResponse

logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/spotify")


@router.get(path="/song/{song_public_id}")
async def get_spotify_song(song_public_id: str, user: UserRow = Depends(dependency=User.get_user_from_session)) -> RockItSongWithAlbumResponse:

    return RockItSongWithAlbumResponse.from_row(song=downloader.spotify.get_song(public_id=song_public_id))


@router.get(path="/album/{album_public_id}")
def get_spotify_album(album_public_id: str, user: UserRow = Depends(dependency=User.get_user_from_session)) -> RockItAlbumWithSongsResponse:
    """TODO"""
    return RockItAlbumWithSongsResponse.from_row(album=downloader.spotify.get_album(public_id=album_public_id, songs=True))


@router.get(path="/playlist/{playlist_public_id}")
def get_spotify_playlist(playlist_public_id: str, update: str | None = None, user: UserRow = Depends(dependency=User.get_user_from_session)) -> RockItPlaylistResponse:
    """TODO"""
    print(update)

    aResultPlaylist: AResult[PlaylistRow] = downloader.spotify.get_playlist(
        public_id=playlist_public_id, update=False)

    return RockItPlaylistResponse.from_row(playlist=aResultPlaylist.result)
