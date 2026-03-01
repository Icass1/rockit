from typing import Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger
from backend.spotify.access.db.ormModels.track import TrackRow

logger = getLogger(__name__)


class TrackAccess:
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
    async def update_track_path_async(
        session: AsyncSession,
        track_id: int,
        path: Optional[str],
        download_url: Optional[str],
    ) -> AResultCode:
        try:
            # Fetch the track
            stmt = select(TrackRow).where(TrackRow.id == track_id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error(f"Track with id {track_id} not found.")
                return AResultCode(
                    code=AResultCode.NOT_FOUND, message="Track not found."
                )

            # Update fields
            track.path = path
            track.download_url = download_url

            # Commit changes
            await session.commit()

            # Refresh and detach
            await session.refresh(track)
            session.expunge(track)

            return AResultCode(code=AResultCode.OK, message="Track updated.")

        except Exception as e:
            logger.error(f"Failed to update track path: {e}")
            return AResultCode(
                code=AResultCode.GENERAL_ERROR, message=f"Failed to update track: {e}"
            )
