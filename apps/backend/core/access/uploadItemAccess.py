from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.uploadItem import UploadItemRow
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from backend.core.utils.safeAsyncCall import safe_async
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class UploadItemAccess:
    @staticmethod
    @safe_async
    async def list_async(
        session: AsyncSession, upload_id: str, user_id: int
    ) -> AResult[list[UploadItemRow]]:
        rows = list(
            await session.scalars(
                select(UploadItemRow)
                .where(
                    UploadItemRow.upload_id == upload_id,
                    UploadItemRow.user_id == user_id,
                )
                .order_by(UploadItemRow.name)
            )
        )
        return AResult(code=AResultCode.OK, message="OK", result=rows)

    @staticmethod
    @safe_async
    async def save_async(
        session: AsyncSession,
        upload_id: str,
        user_id: int,
        name: str,
        storage_object_id: int,
    ) -> AResult[tuple[UploadItemRow, StorageObjectRow | None]]:
        row = await session.scalar(
            select(UploadItemRow)
            .where(UploadItemRow.upload_id == upload_id, UploadItemRow.name == name)
            .with_for_update()
        )
        previous = row.storage_object if row is not None else None
        if row is None:
            row = UploadItemRow(
                upload_id=upload_id,
                user_id=user_id,
                name=name,
                storage_object_id=storage_object_id,
            )
            session.add(instance=row)
        elif row.user_id != user_id:
            logger.warning("Upload owner mismatch")
            return AResult(code=AResultCode.NOT_FOUND, message="Upload not found")
        else:
            row.storage_object_id = storage_object_id
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=(row, previous))

    @staticmethod
    @safe_async
    async def remove_async(
        session: AsyncSession, rows: list[UploadItemRow]
    ) -> AResultCode:
        if rows:
            await session.execute(
                delete(UploadItemRow).where(
                    UploadItemRow.id.in_([row.id for row in rows])
                )
            )
        await session.flush()
        return AResultCode(code=AResultCode.OK, message="OK")
