from typing import Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResultCode
from backend.utils.logger import getLogger
from backend.spotify.access.db.ormModels.track import TrackRow

logger = getLogger(__name__)


class TrackAccess:
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
