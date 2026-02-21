from typing import Tuple
from sqlalchemy.future import select
from sqlalchemy import Result, Select

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db

from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.utils.logger import getLogger


logger = getLogger(__name__)


class SpotifyAccess:
    @staticmethod
    async def get_album_async(id: str) -> AResult[AlbumRow]:
        try:
            async with rockit_db.session_scope_async() as s:

                stmt: Select[Tuple[AlbumRow]] = (
                    select(AlbumRow)
                    .join(CoreAlbumRow, CoreAlbumRow.id == AlbumRow.id)
                    .where(CoreAlbumRow.public_id == id)
                )
                result: Result[Tuple[AlbumRow]] = await s.execute(stmt)
                album: AlbumRow | None = result.scalar_one_or_none()

                if not album:
                    logger.error("Album not found")
                    return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

                # Detach from session BEFORE closing session.
                s.expunge(instance=album)
                return AResult(code=AResultCode.OK, message="OK", result=album)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album from id {id}: {e}")
