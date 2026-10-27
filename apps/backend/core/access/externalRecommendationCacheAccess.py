from datetime import UTC, datetime, timedelta
from typing import Any, cast

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.externalRecommendationCache import (
    ExternalRecommendationCacheRow,
)
from core.aResult import AResult, AResultCode
from logger import getLogger

logger = getLogger(__name__)


class ExternalRecommendationCacheAccess:
    @staticmethod
    async def get_cached_async(
        session: AsyncSession,
        cache_key: str,
    ) -> AResult[tuple[list[dict[str, Any]], timedelta]]:
        """OK with (cached suggestion dicts, age of the entry) on a hit;
        NOT_FOUND on a miss. Freshness is the caller's decision. Callers
        treat any non-OK result as a miss."""

        try:
            stmt = select(ExternalRecommendationCacheRow).where(
                ExternalRecommendationCacheRow.id == cache_key
            )
            row: ExternalRecommendationCacheRow | None = (
                await session.execute(stmt)
            ).scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Not cached")

            age = datetime.now(UTC) - row.date_updated

            suggestions = row.json.get("suggestions")
            if not isinstance(suggestions, list):
                logger.warning(f"Malformed external recommendation cache '{cache_key}'")
                return AResult(code=AResultCode.NOT_FOUND, message="Cache malformed")

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=(
                    [
                        cast(dict[str, Any], s)
                        for s in cast(list[Any], suggestions)
                        if isinstance(s, dict)
                    ],
                    age,
                ),
            )
        except Exception as e:
            logger.error(
                f"Error reading external recommendation cache '{cache_key}': {e}",
                exc_info=True,
            )
            return AResult(code=AResultCode.GENERAL_ERROR, message=str(e))

    @staticmethod
    async def set_cached_async(
        session: AsyncSession,
        cache_key: str,
        suggestions: list[dict[str, Any]],
    ) -> AResult[bool]:
        """Upsert a provider answer. Runs inside a SAVEPOINT so a failed write
        never aborts the request's surrounding transaction."""

        try:
            payload: dict[str, Any] = {"suggestions": suggestions}
            async with session.begin_nested():
                stmt = (
                    insert(ExternalRecommendationCacheRow)
                    .values(id=cache_key, json=payload)
                    .on_conflict_do_update(
                        index_elements=[ExternalRecommendationCacheRow.id],
                        set_={
                            "json": payload,
                            "date_updated": datetime.now(UTC),
                        },
                    )
                )
                await session.execute(stmt)
            return AResult(code=AResultCode.OK, message="OK", result=True)
        except Exception as e:
            logger.error(
                f"Error writing external recommendation cache '{cache_key}': {e}",
                exc_info=True,
            )
            return AResult(code=AResultCode.GENERAL_ERROR, message=str(e))
