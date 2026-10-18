from typing import cast
from sqlalchemy import select, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from backend.core.utils.safeAsyncCall import safe_async


class StorageAuditAccess:
    @staticmethod
    @safe_async
    async def inspect_async(
        session: AsyncSession, bucket: str
    ) -> AResult[tuple[list[StorageObjectRow], set[int]]]:
        """Read metadata and all domain references with a fixed pair of queries."""
        rows = list(
            await session.scalars(
                select(StorageObjectRow).where(StorageObjectRow.bucket == bucket)
            )
        )
        references = [
            select(column).where(column.is_not(None))
            for table in CoreBase.metadata.tables.values()
            for column in table.columns
            if any(
                key.target_fullname == "core.storage_object.id"
                for key in column.foreign_keys
            )
        ]
        ids = cast(
            set[int],
            (
                set(await session.scalars(union_all(*references)))
                if references
                else set()
            ),
        )
        return AResult(code=AResultCode.OK, message="OK", result=(rows, ids))
