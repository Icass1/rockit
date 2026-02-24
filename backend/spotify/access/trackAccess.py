from typing import Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.db import rockit_db
from backend.core.aResult import AResultCode
from backend.utils.logger import getLogger
from backend.spotify.access.db.ormModels.track import TrackRow

logger = getLogger(__name__)


class TrackAccess:
    @staticmethod
    async def update_track_path_async(
        track_id: int,
        path: Optional[str],
        download_url: Optional[str],
        session: AsyncSession | None = None
    ) -> AResultCode:
        try:
            async with rockit_db.session_scope_or_session_async(session) as s:
                # Fetch the track
                stmt = select(TrackRow).where(TrackRow.id == track_id)
                result = await s.execute(stmt)
                track: TrackRow | None = result.scalar_one_or_none()

                if not track:
                    logger.error(f"Track with id {track_id} not found.")
                    return AResultCode(
                        code=AResultCode.NOT_FOUND,
                        message="Track not found."
                    )

                # Update fields
                track.path = path
                track.download_url = download_url

                # Commit changes
                await s.commit()

                # Refresh and detach
                await s.refresh(track)
                s.expunge(track)

                return AResultCode(code=AResultCode.OK, message="Track updated.")

        except Exception as e:
            logger.error(f"Failed to update track path: {e}")
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to update track: {e}"
            )
