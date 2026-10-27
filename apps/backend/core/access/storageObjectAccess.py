from sqlalchemy import Result as DBResult
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from core.access.db.ormModels.storageObject import StorageObjectRow
from core.utils.createId import create_id
from core.utils.safeAsyncCall import safe_async
from logger import logger
from result import Result, ResultCode


class StorageObjectAccess:
    @staticmethod
    @safe_async
    async def get_all_objects_async(
        session: AsyncSession,
    ) -> Result[list[StorageObjectRow]]:
        """Get all objects from the database."""

        try:
            stmt: Select[tuple[StorageObjectRow]] = select(StorageObjectRow)
            result: DBResult[tuple[StorageObjectRow]] = await session.execute(stmt)
            rows: list[StorageObjectRow] = list(result.scalars().all())

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting all storage objects: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting all storage objects",
            )

    @staticmethod
    @safe_async
    async def get_object_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> Result[StorageObjectRow]:
        """Get a StorageObjectRow by its internal ID."""

        stmt: Select[tuple[StorageObjectRow]] = select(StorageObjectRow).where(
            StorageObjectRow.id == id
        )
        result: DBResult[tuple[StorageObjectRow]] = await session.execute(stmt)
        row: StorageObjectRow | None = result.scalar_one_or_none()

        if row is None:
            return Result(code=ResultCode.NOT_FOUND, message="Storage object not found")

        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_object_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> Result[StorageObjectRow]:
        """Get a StorageObjectRow by its public ID."""

        stmt: Select[tuple[StorageObjectRow]] = select(StorageObjectRow).where(
            StorageObjectRow.public_id == public_id
        )
        result: DBResult[tuple[StorageObjectRow]] = await session.execute(stmt)
        row: StorageObjectRow | None = result.scalar_one_or_none()

        if row is None:
            return Result(code=ResultCode.NOT_FOUND, message="Storage object not found")

        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_object_from_key_async(
        session: AsyncSession,
        key: str,
    ) -> Result[StorageObjectRow]:
        """Get a StorageObjectRow by its object storage key (or original key)."""

        stmt: Select[tuple[StorageObjectRow]] = select(StorageObjectRow).where(
            or_(StorageObjectRow.key == key, StorageObjectRow.original_key == key)
        )
        result: DBResult[tuple[StorageObjectRow]] = await session.execute(stmt)
        row: StorageObjectRow | None = result.scalar_one_or_none()

        if row is None:
            return Result(code=ResultCode.NOT_FOUND, message="Storage object not found")

        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def insert_object_async(
        session: AsyncSession,
        bucket: str,
        key: str,
        content_type: str | None = None,
        size_bytes: int = 0,
        etag: str | None = None,
        original_key: str | None = None,
    ) -> Result[StorageObjectRow]:
        """Insert a new StorageObjectRow into the database."""

        try:
            existing_stmt: Select[tuple[StorageObjectRow]] = select(StorageObjectRow).where(
                StorageObjectRow.key == key
            )
            existing_result: DBResult[tuple[StorageObjectRow]] = await session.execute(
                existing_stmt
            )
            existing_row: StorageObjectRow | None = existing_result.scalar_one_or_none()

            if existing_row is not None:
                if etag is not None:
                    existing_row.etag = etag
                    existing_row.size_bytes = size_bytes
                    existing_row.content_type = content_type
                    await session.flush()
                if original_key and not existing_row.original_key:
                    existing_row.original_key = original_key
                    await session.flush()
                return Result(code=ResultCode.OK, message="OK", result=existing_row)

            storage_object: StorageObjectRow = StorageObjectRow(
                public_id=create_id(32),
                bucket=bucket,
                key=key,
                original_key=original_key,
                content_type=content_type,
                size_bytes=size_bytes,
                etag=etag,
            )
            session.add(storage_object)
            await session.flush()

            return Result(code=ResultCode.OK, message="OK", result=storage_object)

        except Exception as e:
            logger.error(f"Error inserting storage object: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error inserting storage object")

    @staticmethod
    @safe_async
    async def delete_object_async(
        session: AsyncSession,
        storage_object_id: int,
    ) -> ResultCode:
        """Delete a StorageObjectRow from the database."""

        try:
            stmt = delete(StorageObjectRow).where(StorageObjectRow.id == storage_object_id)
            await session.execute(stmt)
            await session.flush()

            return ResultCode(code=ResultCode.OK, message="OK")

        except Exception as e:
            logger.error(f"Error deleting storage object: {e}", exc_info=True)
            return ResultCode(
                code=ResultCode.GENERAL_ERROR,
                message="Error deleting storage object",
            )
