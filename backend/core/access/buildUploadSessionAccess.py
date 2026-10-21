from logging import Logger
from typing import Tuple

from sqlalchemy import Result, Select, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.utils.safeAsyncCall import safe_async

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.buildUploadSession import BuildUploadSessionRow

logger: Logger = getLogger(__name__)


class BuildUploadSessionAccess:
    @staticmethod
    @safe_async
    async def get_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BuildUploadSessionRow]:
        stmt: Select[Tuple[BuildUploadSessionRow]] = select(
            BuildUploadSessionRow
        ).where(BuildUploadSessionRow.public_id == public_id)
        result: Result[Tuple[BuildUploadSessionRow]] = await session.execute(
            statement=stmt
        )
        row: BuildUploadSessionRow | None = result.scalar_one_or_none()
        if not row:
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Upload session not found.",
            )
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def create_async(
        session: AsyncSession,
        public_id: str,
        user_id: int,
        file_path: str,
        version: str,
        description: str | None,
        version_filename: str,
        total_chunks: int,
    ) -> AResult[BuildUploadSessionRow]:
        row = BuildUploadSessionRow(
            public_id=public_id,
            user_id=user_id,
            file_path=file_path,
            version=version,
            description=description,
            version_filename=version_filename,
            total_chunks=total_chunks,
        )
        session.add(instance=row)
        await session.commit()
        await session.refresh(instance=row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def increment_chunks_received_async(
        session: AsyncSession, public_id: str
    ) -> AResult[BuildUploadSessionRow]:
        stmt: Select[Tuple[BuildUploadSessionRow]] = select(
            BuildUploadSessionRow
        ).where(BuildUploadSessionRow.public_id == public_id)
        result: Result[Tuple[BuildUploadSessionRow]] = await session.execute(
            statement=stmt
        )
        row: BuildUploadSessionRow | None = result.scalar_one_or_none()
        if not row:
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Upload session not found.",
            )
        row.chunks_received += 1
        await session.commit()
        await session.refresh(instance=row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def delete_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[bool]:
        stmt = delete(BuildUploadSessionRow).where(
            BuildUploadSessionRow.public_id == public_id
        )
        await session.execute(statement=stmt)
        await session.commit()
        return AResult(code=AResultCode.OK, message="OK", result=True)
