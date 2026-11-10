from sqlalchemy import Result as DBResult
from sqlalchemy import delete, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
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
        """Upsert by stored or original key while preserving existing references."""

        stmt = insert(StorageObjectRow).values(
            public_id=create_id(32),
            bucket=bucket,
            key=key,
            original_key=original_key,
            content_type=content_type,
            size_bytes=size_bytes,
            etag=etag,
        )
        updates = {
            "bucket": stmt.excluded.bucket,
            "key": stmt.excluded.key,
            "original_key": func.coalesce(
                stmt.excluded.original_key, StorageObjectRow.original_key
            ),
            "date_updated": func.now(),
        }
        if etag is not None:
            updates.update(
                content_type=stmt.excluded.content_type,
                size_bytes=stmt.excluded.size_bytes,
                etag=stmt.excluded.etag,
            )
        key_upsert = stmt.on_conflict_do_update(
            index_elements=[StorageObjectRow.key], set_=updates
        ).returning(StorageObjectRow)

        if original_key is None:
            result = await session.execute(
                key_upsert, execution_options={"populate_existing": True}
            )
        else:
            try:
                # A different stored key can already own this original key. Keep
                # that conflict inside a savepoint so the retry can reuse its row.
                async with session.begin_nested():
                    result = await session.execute(
                        key_upsert, execution_options={"populate_existing": True}
                    )
            except IntegrityError as error:
                if getattr(error.orig, "sqlstate", None) != "23505":
                    raise
                original_upsert = stmt.on_conflict_do_update(
                    index_elements=[StorageObjectRow.original_key], set_=updates
                ).returning(StorageObjectRow)
                result = await session.execute(
                    original_upsert, execution_options={"populate_existing": True}
                )

        storage_object: StorageObjectRow = result.scalar_one()
        await session.flush()
        return Result(code=ResultCode.OK, message="OK", result=storage_object)

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
