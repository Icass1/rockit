from logging import Logger
from typing import List, Literal

from fastapi import Depends, HTTPException,  Response,  APIRouter

from sqlalchemy import and_, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.dialects.postgresql.dml import Insert

from backend.db.associationTables.user_library_lists import user_library_lists

from backend.db.ormModels.main.list import ListRow
from backend.db.ormModels.main.user import UserRow
from backend.db.ormModels.main.album import AlbumRow
from backend.db.ormModels.main.playlist import PlaylistRow

from backend.responses.general.albumWithoutSongs import RockItAlbumWithoutSongsResponse
from backend.responses.general.playlist import RockItPlaylistResponse
from backend.responses.libraryListsResponse import LibraryListsResponse

from backend.utils.logger import getLogger
from backend.utils.auth import get_current_user


from backend.init import rockit_db


router = APIRouter(prefix="/library")
logger: Logger = getLogger(__name__, "library")


@router.get("/add-list/{type}/{publicId}")
async def add_list_to_library(type: str, publicId: str, current_user: UserRow = Depends(get_current_user)) -> Response:
    """TODO"""

    with rockit_db.session_scope() as s:

        list_row: ListRow | None = s.query(ListRow).where(
            and_(
                ListRow.type == type,
                ListRow.public_id == publicId
            )
        ).first()

        if not list_row:
            raise HTTPException(status_code=404, detail="List not found")

        user_id: int = current_user.id
        list_id: int = list_row.id

        stmt: Insert = insert(user_library_lists).values(
            (user_id, list_id)
        )

        s.execute(stmt)

    return Response("OK")


@router.get("/remove-list/{type}/{publicId}")
async def remove_list_from_library(type: Literal["album", "playlist"], publicId: str, current_user: UserRow = Depends(get_current_user)) -> Response:
    """TODO"""

    with rockit_db.session_scope() as s:

        list_row = s.query(ListRow).where(
            ListRow.type == type and ListRow.public_id == publicId).first()

        if not list_row:
            raise HTTPException(status_code=404, detail="List not found")

        user_id: int = current_user.id
        list_id: int = list_row.id

        stmt = delete(user_library_lists).where(user_library_lists.c.user_id ==
                                                user_id and user_library_lists.c.list_id == list_id)

        s.execute(stmt)

    return Response("OK")


@router.get("/lists")
async def get_library_lists(current_user: UserRow = Depends(get_current_user)) -> LibraryListsResponse:
    """TODO"""

    with rockit_db.session_scope() as s:

        user: UserRow | None = s.query(UserRow).where(
            UserRow.id == current_user.id).first()

        if not user:
            logger.error("This should never happen.")
            raise HTTPException(status_code=500)

        library_lists: List[ListRow] = user.lists

        album_rows: List[AlbumRow] = []
        playlist_rows: List[PlaylistRow] = []

        for library_list in library_lists:
            if library_list.album:
                album_rows.append(library_list.album)
            if library_list.playlist:
                playlist_rows.append(library_list.playlist)

        return LibraryListsResponse(
            albums=[RockItAlbumWithoutSongsResponse.from_row(
                album_row) for album_row in album_rows],
            playlists=[RockItPlaylistResponse.from_row(
                playlist_row) for playlist_row in playlist_rows]
        )
