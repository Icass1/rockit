from typing import Dict, Any, Tuple
from sqlalchemy.future import select
from sqlalchemy import Result, Select

from backend.utils.logger import getLogger

from backend.core.access.db import rockit_db
from backend.core.aResult import AResult, AResultCode

from backend.spotify.access.db.ormModels.albumCache import CacheAlbumRow


logger = getLogger(__name__)


class SpotifyCacheAccess:
    @staticmethod
    async def get_album_async(id: str) -> AResult[CacheAlbumRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Select[Tuple[CacheAlbumRow]] = select(
                    CacheAlbumRow).where(CacheAlbumRow.id == id)
                result: Result[Tuple[CacheAlbumRow]] = await s.execute(statement=stmt)

                user: CacheAlbumRow | None = result.scalar_one_or_none()

                if not user:
                    logger.error("Album not found in cache.")
                    return AResult(code=AResultCode.NOT_FOUND, message="User not found.")

                # Detach from session BEFORE closing session.
                s.expunge(instance=user)
                return AResult(code=AResultCode.OK, message="OK", result=user)

        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to album cache from id: {e}.")

    @staticmethod
    async def add_album_async(id: str, json: Dict[str, Any]) -> AResultCode:
        try:
            async with rockit_db.session_scope_async() as s:
                cache_row = CacheAlbumRow(id=id, json=json)

                s.add(instance=cache_row)
                await s.commit()
                await s.refresh(instance=cache_row)
                s.expunge(instance=cache_row)

                return AResultCode(code=AResultCode.OK, message="OK")
        except Exception as e:
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to create user: {e}.")
