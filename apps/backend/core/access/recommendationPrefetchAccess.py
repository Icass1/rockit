from datetime import datetime

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.download import DownloadRow
from core.access.db.ormModels.downloadGroup import DownloadGroupRow
from core.access.db.ormModels.media import CoreMediaRow
from core.aResult import AResult, AResultCode
from core.enums.downloadStatusEnum import DownloadStatusEnum
from core.framework.models.recommendationPrefetch import (
    RecommendationPrefetchState,
)
from core.utils.safeAsyncCall import safe_async

AUTOPLAY_DOWNLOAD_TITLE = "Autoplay"
_ACTIVE = [
    status.value
    for status in (
        DownloadStatusEnum.PENDING,
        DownloadStatusEnum.IN_PROGRESS,
        DownloadStatusEnum.FETCHING,
        DownloadStatusEnum.WAITING_FOR_QUEUE_SETUP,
        DownloadStatusEnum.RETRYING,
    )
]


class RecommendationPrefetchAccess:
    @staticmethod
    @safe_async
    async def get_state_async(
        session: AsyncSession, failed_since: datetime, public_id: str | None = None
    ) -> AResult[RecommendationPrefetchState]:
        """Serialize automatic admissions across workers until the downloader
        commits its records. Manual downloads retain their existing limits.
        Do not wait behind another prefetch request; playback uses local files.
        """
        acquired = await session.scalar(text("SELECT pg_try_advisory_xact_lock(724193, 1)"))
        if not acquired:
            return AResult(
                code=AResultCode.OK,
                message="Prefetch busy",
                result=RecommendationPrefetchState(locked=False),
            )
        pending = await session.scalar(
            select(func.count(DownloadRow.id))
            .join(DownloadGroupRow, DownloadGroupRow.id == DownloadRow.download_group_id)
            .where(
                DownloadGroupRow.title == AUTOPLAY_DOWNLOAD_TITLE,
                DownloadRow.status_key.in_(_ACTIVE),
            )
        )
        media_pending = False
        if public_id:
            existing = await session.scalar(
                select(DownloadRow.id)
                .join(CoreMediaRow, CoreMediaRow.id == DownloadRow.media_id)
                .where(
                    CoreMediaRow.public_id == public_id,
                    (DownloadRow.status_key.in_(_ACTIVE))
                    | (
                        (DownloadRow.status_key == DownloadStatusEnum.FAILED.value)
                        & (DownloadRow.date_started >= failed_since)
                    ),
                )
                .limit(1)
            )
            media_pending = existing is not None
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RecommendationPrefetchState(
                locked=True, pending_count=pending or 0, media_pending=media_pending
            ),
        )
