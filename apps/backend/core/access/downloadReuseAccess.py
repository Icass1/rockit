from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.download import DownloadRow
from core.access.db.ormModels.downloadGroup import DownloadGroupRow
from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.provider import ProviderRow
from core.access.providerStorage import provider_storage
from core.aResult import AResult, AResultCode
from core.framework.models.downloadCandidate import DownloadCandidate
from core.utils.backendUtils import create_id
from core.utils.safeAsyncCall import safe_async


class DownloadReuseAccess:
    @staticmethod
    @safe_async
    async def candidates_async(
        session: AsyncSession, public_ids: list[str]
    ) -> AResult[list[DownloadCandidate]]:
        """Read playable IDs and their stored file paths in one local batch query."""
        paths = provider_storage.files()
        rows = (
            await session.execute(
                select(
                    CoreMediaRow.id,
                    CoreMediaRow.public_id,
                    CoreMediaRow.provider_id,
                    paths.c.path,
                    paths.c.name,
                    ProviderRow.name.label("provider"),
                )
                .select_from(CoreMediaRow)
                .outerjoin(paths, paths.c.id == CoreMediaRow.id)
                .join(ProviderRow, ProviderRow.id == CoreMediaRow.provider_id)
                .where(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key.in_([4, 5]),
                )
            )
        ).all()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[
                DownloadCandidate(
                    id=row.id,
                    public_id=row.public_id,
                    provider_id=row.provider_id,
                    path=row.path,
                    name=row.name or row.public_id,
                    provider=row.provider,
                )
                for row in rows
            ],
        )

    @staticmethod
    @safe_async
    async def create_group_items_async(
        session: AsyncSession,
        group: DownloadGroupRow,
        candidates: list[DownloadCandidate],
        existing_ids: set[int],
    ) -> AResult[list[DownloadRow]]:
        """Give each source its own records, marking reused files complete without queueing."""
        now = datetime.now(UTC)
        rows = [
            DownloadRow(
                public_id=create_id(32),
                download_group_id=group.id,
                media_id=candidate.id,
                date_started=now,
                status_key=3 if candidate.id in existing_ids else 1,
                date_ended=now if candidate.id in existing_ids else None,
            )
            for candidate in candidates
        ]
        session.add_all(rows)
        group.success = len(existing_ids)
        group.fail = 0
        group.status_key = 3 if rows and len(existing_ids) == len(rows) else 1
        group.date_ended = now if group.status_key == 3 else None
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=rows)
