from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from logger import getLogger
from result import Result, ResultCode
from spotify.access.db.ormModels.track import TrackRow

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

            track.path = None

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
        path: str | None,
        download_url: str | None,
    ) -> ResultCode:
        try:
            # Fetch the track
            stmt = select(TrackRow).where(TrackRow.id == track_id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with id {track_id} not found.")
                return ResultCode(code=ResultCode.NOT_FOUND, message="Track not found.")

            # Update fields
            track.path = path
            track.download_url = download_url

            # Commit changes
            await session.commit()

            # Refresh and detach
            await session.refresh(track)
            session.expunge(track)

            return ResultCode(code=ResultCode.OK, message="Track updated.")

        except Exception as e:
            logger.error(f"Failed to update track path: {e}")
            return ResultCode(code=ResultCode.GENERAL_ERROR, message=f"Failed to update track: {e}")
