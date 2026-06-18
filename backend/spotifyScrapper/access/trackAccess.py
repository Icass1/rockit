from typing import Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger
from backend.spotifyScrapper.access.db.ormModels.track import TrackRow

logger = getLogger(__name__)


class TrackAccess:
    @staticmethod
    async def get_track_by_spotify_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> AResult[TrackRow]:
        try:
            stmt = select(TrackRow).where(TrackRow.spotify_id == spotify_id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with spotify_id {spotify_id} not found.")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Track not found.",
                    result=None,
                )

            session.expunge(track)
            return AResult(code=AResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track by spotify_id: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track: {e}",
                result=None,
            )

    @staticmethod
    async def get_track_by_id_async(
        session: AsyncSession,
        track_id: int,
    ) -> AResult[TrackRow]:
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
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Track not found.",
                    result=None,
                )

            session.expunge(track)
            return AResult(code=AResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track by id: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track: {e}",
                result=None,
            )

    @staticmethod
    async def clear_track_path_async(
        session: AsyncSession,
        track_id: int,
    ) -> AResultCode:
        try:
            stmt = select(TrackRow).where(TrackRow.id == track_id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with id {track_id} not found.")
                return AResultCode(
                    code=AResultCode.NOT_FOUND, message="Track not found."
                )

            track.path = None

            await session.commit()

            await session.refresh(track)
            session.expunge(track)

            return AResultCode(code=AResultCode.OK, message="Track path cleared.")

        except Exception as e:
            logger.error(f"Failed to clear track path: {e}")
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to clear track path: {e}",
            )

    @staticmethod
    async def update_track_path_async(
        session: AsyncSession,
        track_id: int,
        path: Optional[str],
        download_url: Optional[str],
    ) -> AResultCode:
        try:
            stmt = select(TrackRow).where(TrackRow.id == track_id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with id {track_id} not found.")
                return AResultCode(
                    code=AResultCode.NOT_FOUND, message="Track not found."
                )

            track.path = path
            track.download_url = download_url

            await session.commit()

            await session.refresh(track)
            session.expunge(track)

            return AResultCode(code=AResultCode.OK, message="Track updated.")

        except Exception as e:
            logger.error(f"Failed to update track path: {e}")
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to update track: {e}",
            )
