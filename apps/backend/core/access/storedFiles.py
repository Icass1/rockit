"""Provider file projections resolve normalized storage-object references."""

import hashlib

from sqlalchemy import Table, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.selectable import FromClause, ScalarSelect

from core.access.db.ormModels.storageObject import StorageObjectRow
from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode


def file_key_column(table: Table) -> ScalarSelect[str]:
    return (
        select(StorageObjectRow.key)
        .where(StorageObjectRow.id == table.c.storage_object_id)
        .correlate(table)
        .scalar_subquery()
    )


@safe_async
async def audio_identity_async(
    session: AsyncSession, table: FromClause, media_id: int
) -> Result[str]:
    """Read an object revision without reading or modifying the S3 object itself."""
    result = await session.execute(
        select(StorageObjectRow)
        .join(table, table.c.storage_object_id == StorageObjectRow.id)
        .where(table.c.id == media_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return Result(code=ResultCode.NOT_FOUND, message="Local audio unavailable")
    identity = f"{row.public_id}:{row.etag}:{row.size_bytes}:{row.date_updated}"
    return Result(
        code=ResultCode.OK, message="OK", result=hashlib.sha256(identity.encode()).hexdigest()
    )
