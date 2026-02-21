from typing import Tuple

from sqlalchemy import select
from sqlalchemy.sql import Select

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.song import CoreSongRow
from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.artist import CoreArtistRow
from backend.core.access.db.ormModels.playlist import CorePlaylistRow

logger = getLogger(__name__)


class MediaAccess:
    @staticmethod
    async def get_song_async(public_id: str) -> AResult[CoreSongRow]:
        """Get a CoreSongRow by public_id."""

        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Select[Tuple[CoreSongRow]] = select(CoreSongRow).where(
                    CoreSongRow.public_id == public_id)
                result = await s.execute(stmt)
                row: CoreSongRow | None = result.scalar_one_or_none()

                if row is None:
                    return AResult(code=AResultCode.NOT_FOUND, message="Song not found")

                s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting song: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting song")

    @staticmethod
    async def get_album_async(public_id: str) -> AResult[CoreAlbumRow]:
        """Get a CoreAlbumRow by public_id."""

        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Select[Tuple[CoreAlbumRow]] = select(CoreAlbumRow).where(
                    CoreAlbumRow.public_id == public_id)
                result = await s.execute(stmt)
                row: CoreAlbumRow | None = result.scalar_one_or_none()

                if row is None:
                    return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

                s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting album: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting album")

    @staticmethod
    async def get_artist_async(public_id: str) -> AResult[CoreArtistRow]:
        """Get a CoreArtistRow by public_id."""

        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Select[Tuple[CoreArtistRow]] = select(CoreArtistRow).where(
                    CoreArtistRow.public_id == public_id)
                result = await s.execute(stmt)
                row: CoreArtistRow | None = result.scalar_one_or_none()

                if row is None:
                    return AResult(code=AResultCode.NOT_FOUND, message="Artist not found")

                s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting artist: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting artist")

    @staticmethod
    async def get_playlist_async(public_id: str) -> AResult[CorePlaylistRow]:
        """Get a CorePlaylistRow by public_id."""

        try:
            async with rockit_db.session_scope_async() as s:
                stmt: Select[Tuple[CorePlaylistRow]] = select(CorePlaylistRow).where(
                    CorePlaylistRow.public_id == public_id)
                result = await s.execute(stmt)
                row: CorePlaylistRow | None = result.scalar_one_or_none()

                if row is None:
                    return AResult(code=AResultCode.NOT_FOUND, message="Playlist not found")

                s.expunge(row)
                return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting playlist: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting playlist")
