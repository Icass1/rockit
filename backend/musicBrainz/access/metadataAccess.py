import asyncio
from datetime import datetime
from typing import Any
from sqlalchemy import select, text, func, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.musicBrainz.access.db.ormModels.metadataCache import MetadataCacheRow
from backend.musicBrainz.access.db.ormModels.requestGate import RequestGateRow

# One transaction lock for every MusicBrainz request across all backend workers.
GATE_LOCK = 725983461


class MetadataAccess:
    @staticmethod
    @safe_async
    async def read_async(
        session: AsyncSession, key: str
    ) -> AResult[list[MetadataCacheRow]]:
        """Read durable source JSON; there is deliberately no automatic expiry."""
        row = await session.scalar(
            select(MetadataCacheRow)
            .where(MetadataCacheRow.key == key)
            .execution_options(populate_existing=True)
        )
        return AResult(
            code=AResultCode.OK, message="OK", result=[row] if row is not None else []
        )

    @staticmethod
    @safe_async
    async def lock_async(session: AsyncSession) -> AResult[float]:
        """Serialize workers and return seconds remaining on the shared gate."""
        # Waiting indefinitely here keeps a database connection occupied and
        # can exhaust the shared pool during a burst of metadata requests.
        deadline = asyncio.get_running_loop().time() + 5.0
        while True:
            acquired = await session.scalar(
                text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": GATE_LOCK}
            )
            if acquired:
                break
            if asyncio.get_running_loop().time() >= deadline:
                return AResult(
                    code=AResultCode.SERVICE_UNAVAILABLE,
                    message="MusicBrainz request queue busy; retry later",
                )
            await asyncio.sleep(0.1)
        await session.execute(
            insert(RequestGateRow)
            .values(id=1, available_at=func.clock_timestamp())
            .on_conflict_do_nothing()
        )
        remaining = await session.scalar(
            select(
                func.extract(
                    "epoch", RequestGateRow.available_at - func.clock_timestamp()
                )
            ).where(RequestGateRow.id == 1)
        )
        return AResult(
            code=AResultCode.OK, message="OK", result=max(0.0, float(remaining or 0))
        )

    @staticmethod
    @safe_async
    async def postpone_async(session: AsyncSession, seconds: float) -> AResultCode:
        """Persist a deadline using the database clock, including Retry-After."""
        await session.execute(
            update(RequestGateRow)
            .where(RequestGateRow.id == 1)
            .values(
                available_at=func.clock_timestamp()
                + text("make_interval(secs => :seconds)")
            ),
            {"seconds": seconds},
        )
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def save_async(
        session: AsyncSession, key: str, payload: dict[str, Any]
    ) -> AResult[datetime]:
        """Atomically replace a complete response; failed fetches never erase data."""
        stmt = insert(MetadataCacheRow).values(
            key=key, payload=payload, fetched_at=func.clock_timestamp()
        )
        stamp = await session.scalar(
            stmt.on_conflict_do_update(
                index_elements=[MetadataCacheRow.key],
                set_={
                    "payload": stmt.excluded.payload,
                    "fetched_at": stmt.excluded.fetched_at,
                },
            ).returning(MetadataCacheRow.fetched_at)
        )
        assert stamp is not None
        return AResult(code=AResultCode.OK, message="OK", result=stamp)
