from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from backend.core.utils.safeAsyncCall import safe_async
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class StorageObjectAccess:
    @staticmethod
    @safe_async
    async def register_async(
        session: AsyncSession, row: StorageObjectRow
    ) -> AResult[StorageObjectRow]:
        """Register immutable metadata in the caller's transaction."""
        session.add(instance=row)
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_async(
        session: AsyncSession, public_id: str
    ) -> AResult[StorageObjectRow]:
        """Resolve a public object identifier without committing."""
        row = await session.scalar(
            select(StorageObjectRow).where(StorageObjectRow.public_id == public_id)
        )
        if row is None:
            logger.warning("Storage object not found")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Storage object not found"
            )
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def delete_async(session: AsyncSession, row: StorageObjectRow) -> AResultCode:
        """Delete metadata only when no domain row references it."""
        await session.delete(instance=row)
        await session.flush()
        return AResultCode(code=AResultCode.OK, message="OK")
