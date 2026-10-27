import hashlib
from datetime import datetime
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode
from wikimedia.access.db.ormModels.metadataCache import MetadataCacheRow


class MetadataAccess:
    @staticmethod
    @safe_async
    async def lock_async(session: AsyncSession, key: str) -> Result[bool]:
        """Deduplicate cold lookups across workers without waiting for a connection."""
        lock_id = int.from_bytes(
            hashlib.sha256(f"wikimedia:{key}".encode()).digest()[:8], signed=True
        )
        acquired = await session.scalar(
            text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": lock_id}
        )
        return Result(code=ResultCode.OK, message="OK", result=bool(acquired))

    @staticmethod
    @safe_async
    async def read_async(session: AsyncSession, key: str) -> Result[list[MetadataCacheRow]]:
        """Read durable source JSON; there is deliberately no automatic expiry."""
        row = await session.scalar(
            select(MetadataCacheRow)
            .where(MetadataCacheRow.key == key)
            .execution_options(populate_existing=True)
        )
        return Result(code=ResultCode.OK, message="OK", result=[row] if row is not None else [])

    @staticmethod
    @safe_async
    async def save_async(
        session: AsyncSession, key: str, payload: dict[str, Any]
    ) -> Result[datetime]:
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
        return Result(code=ResultCode.OK, message="OK", result=stamp)
