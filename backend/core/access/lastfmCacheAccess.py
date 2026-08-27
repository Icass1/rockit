from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.lastfmCache import LastfmCacheRow
from backend.core.framework.lastfmClient import SimilarTrack
from backend.utils.logger import getLogger

logger = getLogger(__name__)

# Last.fm's ToS requires similar-artist/track data to be cached for at
# least a week; this is comfortably above that floor.
CACHE_MAX_AGE_DAYS = 14


def build_cache_key(artist_name: str, track_name: str) -> str:
    return f"{artist_name.strip().lower()}|{track_name.strip().lower()}"


class LastfmCacheAccess:
    @staticmethod
    async def get_cached_similar_tracks_async(
        session: AsyncSession,
        cache_key: str,
    ) -> AResult[List[SimilarTrack]]:
        """OK with the cached tracks on a fresh hit; NOT_FOUND (empty
        result) on a miss or a stale entry — callers should treat both
        the same way (fetch fresh) and only branch on is_ok()."""

        try:
            stmt = select(LastfmCacheRow).where(LastfmCacheRow.id == cache_key)
            row: LastfmCacheRow | None = (
                await session.execute(stmt)
            ).scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Not cached")

            age = datetime.now(timezone.utc) - row.date_updated
            if age > timedelta(days=CACHE_MAX_AGE_DAYS):
                return AResult(code=AResultCode.NOT_FOUND, message="Cache stale")

            return AResult(code=AResultCode.OK, message="OK", result=row.json["tracks"])
        except Exception as e:
            logger.error(
                f"Error reading Last.fm cache for '{cache_key}': {e}", exc_info=True
            )
            return AResult(code=AResultCode.GENERAL_ERROR, message=str(e))

    @staticmethod
    async def set_cached_similar_tracks_async(
        session: AsyncSession,
        cache_key: str,
        tracks: List[SimilarTrack],
    ) -> AResult[bool]:
        try:
            stmt = (
                insert(LastfmCacheRow)
                .values(id=cache_key, json={"tracks": tracks})
                .on_conflict_do_update(
                    index_elements=[LastfmCacheRow.id],
                    set_={"json": {"tracks": tracks}},
                )
            )
            await session.execute(stmt)
            await session.commit()
            return AResult(code=AResultCode.OK, message="OK", result=True)
        except Exception as e:
            logger.error(
                f"Error writing Last.fm cache for '{cache_key}': {e}", exc_info=True
            )
            await session.rollback()
            return AResult(code=AResultCode.GENERAL_ERROR, message=str(e))
