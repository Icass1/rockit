from typing import Dict, Any, Tuple, List
from sqlalchemy.future import select
from sqlalchemy import Result, Select

from backend.utils.logger import getLogger

from backend.core.access.db import rockit_db
from backend.core.aResult import AResult, AResultCode

from backend.spotify.access.db.ormModels.albumCache import CacheAlbumRow
from backend.spotify.access.db.ormModels.trackCache import CacheTrackRow
from backend.spotify.access.db.ormModels.artistCache import CacheArtistRow
from backend.spotify.access.db.ormModels.playlistCache import CachePlaylistRow


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

    @staticmethod
    async def get_albums_by_ids_async(ids: List[str]) -> AResult[List[CacheAlbumRow]]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt = select(CacheAlbumRow).where(CacheAlbumRow.id.in_(ids))
                result = await s.execute(stmt)
                rows = result.scalars().all()
                for row in rows:
                    s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=list(rows))
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get albums from cache: {e}.")

    @staticmethod
    async def get_track_async(id: str) -> AResult[CacheTrackRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt = select(CacheTrackRow).where(CacheTrackRow.id == id)
                result = await s.execute(stmt)
                row: CacheTrackRow | None = result.scalar_one_or_none()
                if not row:
                    return AResult(code=AResultCode.NOT_FOUND, message="Track not found in cache.")
                s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track cache: {e}.")

    @staticmethod
    async def add_track_async(id: str, json: Dict[str, Any]) -> AResultCode:
        try:
            async with rockit_db.session_scope_async() as s:
                cache_row = CacheTrackRow(id=id, json=json)
                s.add(cache_row)
                await s.commit()
                await s.refresh(cache_row)
                s.expunge(cache_row)
                return AResultCode(code=AResultCode.OK, message="OK")
        except Exception as e:
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add track to cache: {e}.")

    @staticmethod
    async def get_tracks_by_ids_async(ids: List[str]) -> AResult[List[CacheTrackRow]]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt = select(CacheTrackRow).where(CacheTrackRow.id.in_(ids))
                result = await s.execute(stmt)
                rows = result.scalars().all()
                for row in rows:
                    s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=list(rows))
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks from cache: {e}.")

    @staticmethod
    async def get_artist_async(id: str) -> AResult[CacheArtistRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt = select(CacheArtistRow).where(CacheArtistRow.id == id)
                result = await s.execute(stmt)
                row: CacheArtistRow | None = result.scalar_one_or_none()
                if not row:
                    return AResult(code=AResultCode.NOT_FOUND, message="Artist not found in cache.")
                s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artist cache: {e}.")

    @staticmethod
    async def add_artist_async(id: str, json: Dict[str, Any]) -> AResultCode:
        try:
            async with rockit_db.session_scope_async() as s:
                cache_row = CacheArtistRow(id=id, json=json)
                s.add(cache_row)
                await s.commit()
                await s.refresh(cache_row)
                s.expunge(cache_row)
                return AResultCode(code=AResultCode.OK, message="OK")
        except Exception as e:
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add artist to cache: {e}.")

    @staticmethod
    async def get_artists_by_ids_async(ids: List[str]) -> AResult[List[CacheArtistRow]]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt = select(CacheArtistRow).where(CacheArtistRow.id.in_(ids))
                result = await s.execute(stmt)
                rows = result.scalars().all()
                for row in rows:
                    s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=list(rows))
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artists from cache: {e}.")

    @staticmethod
    async def get_playlist_async(id: str) -> AResult[CachePlaylistRow]:
        try:
            async with rockit_db.session_scope_async() as s:
                stmt = select(CachePlaylistRow).where(CachePlaylistRow.id == id)
                result = await s.execute(stmt)
                row: CachePlaylistRow | None = result.scalar_one_or_none()
                if not row:
                    return AResult(code=AResultCode.NOT_FOUND, message="Playlist not found in cache.")
                s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=row)
        except Exception as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist cache: {e}.")

    @staticmethod
    async def add_playlist_async(id: str, json: Dict[str, Any]) -> AResultCode:
        try:
            async with rockit_db.session_scope_async() as s:
                cache_row = CachePlaylistRow(id=id, json=json)
                s.add(cache_row)
                await s.commit()
                await s.refresh(cache_row)
                s.expunge(cache_row)
                return AResultCode(code=AResultCode.OK, message="OK")
        except Exception as e:
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add playlist to cache: {e}.")
