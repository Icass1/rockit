from fastapi import APIRouter, Depends


from backend.db.associationTables.user_history_songs import user_history_songs
from backend.db.ormModels.album import AlbumRow
from backend.db.ormModels.artist import ArtistRow
from backend.db.ormModels.song import SongRow
from backend.db.ormModels.user import UserRow
from backend.utils.auth import get_current_user

from backend.init import rockit_db

router = APIRouter(prefix="/user")


@router.get("")
def stats(current_user: UserRow = Depends(get_current_user)):

    return current_user
