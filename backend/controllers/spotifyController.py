from fastapi import Depends, APIRouter
from logging import Logger

from backend.db.ormModels.main.user import UserRow

from backend.init import downloader
from backend.responses.rockItSongWithAlbumResponse import RockItSongWithAlbumResponse
from backend.utils.logger import getLogger
from backend.framework.user.user import User


logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/spotify")


@router.get("/song/{song_public_id}")
async def serach(song_public_id: str, user: UserRow = Depends(dependency=User.get_current_user)) -> RockItSongWithAlbumResponse:

    return RockItSongWithAlbumResponse.from_row(song=downloader.spotify.get_song(public_id=song_public_id))
