from typing import Tuple

from sqlalchemy.sql import Select
from sqlalchemy import Result, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.song import CoreSongRow
from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.artist import CoreArtistRow
from backend.core.access.db.ormModels.playlist import CorePlaylistRow
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.video import CoreVideoRow

logger = getLogger(__name__)


class MediaAccess:
    @staticmethod
    async def get_song_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[CoreSongRow]:
        """Get a CoreSongRow by public_id."""

        try:
            stmt: Select[Tuple[CoreSongRow]] = select(CoreSongRow).where(
                CoreSongRow.public_id == public_id
            )
            result = await session.execute(stmt)
            row: CoreSongRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Song not found")

            session.expunge(row)
            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting song: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting song")

    @staticmethod
    async def get_song_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[CoreSongRow]:
        """Get a CoreSongRow by id."""

        try:
            stmt: Select[Tuple[CoreSongRow]] = select(CoreSongRow).where(
                CoreSongRow.id == id
            )
            result: Result[Tuple[CoreSongRow]] = await session.execute(stmt)
            row: CoreSongRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Song not found")

            session.expunge(row)

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting song: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting song")

    @staticmethod
    async def get_album_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[CoreAlbumRow]:
        """Get a CoreAlbumRow by public_id."""

        try:
            stmt: Select[Tuple[CoreAlbumRow]] = select(CoreAlbumRow).where(
                CoreAlbumRow.public_id == public_id
            )
            result = await session.execute(stmt)
            row: CoreAlbumRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

            session.expunge(row)
            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting album: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting album"
            )

    @staticmethod
    async def get_album_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[CoreAlbumRow]:
        """Get a CoreAlbumRow by id."""

        try:
            stmt: Select[Tuple[CoreAlbumRow]] = select(CoreAlbumRow).where(
                CoreAlbumRow.id == id
            )
            result: Result[Tuple[CoreAlbumRow]] = await session.execute(stmt)
            row: CoreAlbumRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

            session.expunge(row)
            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting album: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting album"
            )

    @staticmethod
    async def get_artist_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[CoreArtistRow]:
        """Get a CoreArtistRow by public_id."""

        try:
            stmt: Select[Tuple[CoreArtistRow]] = select(CoreArtistRow).where(
                CoreArtistRow.public_id == public_id
            )
            result = await session.execute(stmt)
            row: CoreArtistRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Artist not found")

            session.expunge(row)
            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting artist: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting artist"
            )

    @staticmethod
    async def get_playlist_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[CorePlaylistRow]:
        """Get a CorePlaylistRow by public_id."""

        try:
            stmt: Select[Tuple[CorePlaylistRow]] = select(CorePlaylistRow).where(
                CorePlaylistRow.public_id == public_id
            )
            result = await session.execute(stmt)
            row: CorePlaylistRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Playlist not found")

            session.expunge(row)
            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting playlist: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting playlist"
            )

    @staticmethod
    async def get_image_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[ImageRow]:
        """Get an ImageRow by public_id."""

        try:
            stmt: Select[Tuple[ImageRow]] = select(ImageRow).where(
                ImageRow.public_id == public_id
            )
            result: Result[Tuple[ImageRow]] = await session.execute(stmt)
            row: ImageRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Image not found")

            session.expunge(row)

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting image"
            )

    @staticmethod
    async def get_image_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[ImageRow]:
        """Get an ImageRow by id."""

        try:
            stmt: Select[Tuple[ImageRow]] = select(ImageRow).where(ImageRow.id == id)
            result: Result[Tuple[ImageRow]] = await session.execute(stmt)
            row: ImageRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Image not found")

            session.expunge(row)

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting image"
            )

    @staticmethod
    async def get_video_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[CoreVideoRow]:
        """Get a CoreVideoRow by id."""

        try:
            stmt: Select[Tuple[CoreVideoRow]] = select(CoreVideoRow).where(
                CoreVideoRow.id == id
            )
            result: Result[Tuple[CoreVideoRow]] = await session.execute(stmt)
            row: CoreVideoRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Video not found")

            session.expunge(row)
            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting video: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting video"
            )
