from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from logger import getLogger
from result import Result, ResultCode
from spotifyScrapper.access.db.ormModels.track import TrackRow

logger = getLogger(__name__)


class TrackAccess:
    @staticmethod
    async def get_track_by_spotify_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> Result[TrackRow]:
        try:
            stmt = select(TrackRow).where(TrackRow.spotify_id == spotify_id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with spotify_id {spotify_id} not found.")
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message="Track not found.",
                    result=None,
                )

            session.expunge(track)
            return Result(code=ResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track by spotify_id: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get track: {e}",
                result=None,
            )

    @staticmethod
    async def get_track_by_id_async(
        session: AsyncSession,
        track_id: int,
    ) -> Result[TrackRow]:
        try:
            stmt = (
                select(TrackRow)
                .where(TrackRow.id == track_id)
                .options(selectinload(TrackRow.album))
            )
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with id {track_id} not found.")
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message="Track not found.",
                    result=None,
                )

            session.expunge(track)
            return Result(code=ResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track by id: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get track: {e}",
                result=None,
            )

    @staticmethod
    async def clear_track_path_async(
        session: AsyncSession,
        track_id: int,
    ) -> ResultCode:
        """Set the track's path to None so it can be re-downloaded."""

        try:
            stmt = select(TrackRow).where(TrackRow.id == track_id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with id {track_id} not found.")
                return ResultCode(code=ResultCode.NOT_FOUND, message="Track not found.")

            track.storage_object_id = None

            await session.commit()

            await session.refresh(track)
            session.expunge(track)

            return ResultCode(code=ResultCode.OK, message="Track path cleared.")

        except Exception as e:
            logger.error(f"Failed to clear track path: {e}")
            return ResultCode(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to clear track path: {e}",
            )

    @staticmethod
    async def update_track_path_async(
        session: AsyncSession,
        track_id: int,
        storage_object_id: int | None,
        download_url: str | None,
    ) -> ResultCode:
        try:
            stmt = select(TrackRow).where(TrackRow.id == track_id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with id {track_id} not found.")
                return ResultCode(code=ResultCode.NOT_FOUND, message="Track not found.")

            track.storage_object_id = storage_object_id
            track.download_url = download_url

            await session.commit()

            await session.refresh(track)
            session.expunge(track)

            return ResultCode(code=ResultCode.OK, message="Track updated.")

        except Exception as e:
            logger.error(f"Failed to update track path: {e}")
            return ResultCode(code=ResultCode.GENERAL_ERROR, message=f"Failed to update track: {e}")

    @staticmethod
    async def update_track_real_duration_async(
        session: AsyncSession,
        track_id: int,
        real_duration_ms: int,
    ) -> ResultCode:
        try:
            stmt = select(TrackRow).where(TrackRow.id == track_id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with id {track_id} not found.")
                return ResultCode(code=ResultCode.NOT_FOUND, message="Track not found.")

            track.real_duration_ms = real_duration_ms

            await session.commit()

            await session.refresh(track)
            session.expunge(track)

            logger.info(f"Updated real_duration_ms for track {track_id}: {real_duration_ms}ms")
            return ResultCode(code=ResultCode.OK, message="Track real duration updated.")

        except Exception as e:
            logger.error(f"Failed to update track real duration: {e}")
            return ResultCode(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to update track real duration: {e}",
            )
