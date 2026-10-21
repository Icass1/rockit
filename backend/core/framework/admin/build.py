import base64
import os
import uuid

from dataclasses import dataclass
from logging import Logger
from typing import List, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.adminVersionAccess import AdminVersionAccess
from backend.core.access.buildUploadSessionAccess import BuildUploadSessionAccess
from backend.core.access.db.ormModels.appVersion import AppVersionRow
from backend.core.access.db.ormModels.buildUploadSession import BuildUploadSessionRow
from backend.constants import BUILDS_PATH, CHUNK_SIZE

logger: Logger = getLogger(__name__)


@dataclass
class StartChunkedUploadResult:
    uploadId: str
    chunkSize: int
    totalChunks: int


@dataclass
class UploadChunkResult:
    uploadId: str
    chunkIndex: int
    chunksReceived: int
    totalChunks: int


@dataclass
class CompleteUploadResult:
    message: Literal["BUILD_UPLOAD_SUCCESS"]
    publicId: str
    filename: str


class AdminBuild:
    @staticmethod
    async def get_all_versions_async(
        session: AsyncSession,
    ) -> AResult[List[AppVersionRow]]:
        """Get all build versions."""

        a_result = await AdminVersionAccess.get_all_versions_async(session=session)
        if a_result.is_not_ok():
            logger.error(f"Error fetching builds. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def add_version_async(
        session: AsyncSession,
        version: str,
        apk_filename: str,
        description: str | None = None,
    ) -> AResult[AppVersionRow]:
        """Add a new build version."""

        a_result = await AdminVersionAccess.add_version_async(
            session=session,
            version=version,
            apk_filename=apk_filename,
            description=description,
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding build. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def start_chunked_upload_async(
        session: AsyncSession,
        user_id: int,
        file_name: str,
        total_size: int,
        version: str,
        description: str | None,
    ) -> AResult[StartChunkedUploadResult]:
        """Initialize a chunked APK upload session."""

        os.makedirs(BUILDS_PATH, exist_ok=True)

        file_ext = os.path.splitext(file_name)[1]
        version_filename = f"v{version}{file_ext}"
        file_path = os.path.join(BUILDS_PATH, version_filename)

        if os.path.exists(file_path):
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message=f"A build with filename '{version_filename}' already exists.",
            )

        with open(file_path, "wb"):
            pass

        public_id = str(uuid.uuid4())
        total_chunks = (total_size + CHUNK_SIZE - 1) // CHUNK_SIZE

        a_result = await BuildUploadSessionAccess.create_async(
            session=session,
            public_id=public_id,
            user_id=user_id,
            file_path=file_path,
            version=version,
            description=description,
            version_filename=version_filename,
            total_chunks=total_chunks,
        )

        if a_result.is_not_ok():
            os.remove(file_path)
            logger.error(f"Error creating upload session. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=StartChunkedUploadResult(
                uploadId=public_id,
                chunkSize=CHUNK_SIZE,
                totalChunks=total_chunks,
            ),
        )

    @staticmethod
    async def upload_chunk_async(
        session: AsyncSession,
        upload_id: str,
        chunk_index: int,
        chunk_data: str,
        total_chunks: int,
    ) -> AResult[UploadChunkResult]:
        """Upload a single chunk for a chunked upload session."""

        a_result = await BuildUploadSessionAccess.get_by_public_id_async(
            session=session, public_id=upload_id
        )

        if a_result.is_not_ok():
            logger.error(f"Upload session not found. {a_result.info()}")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message=a_result.message(),
            )

        upload: BuildUploadSessionRow = a_result.result()

        if chunk_index >= total_chunks:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Invalid chunk index.",
            )

        try:
            decoded = base64.b64decode(chunk_data)
        except Exception:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Invalid base64 chunk data.",
            )

        with open(upload.file_path, "ab") as f:
            f.write(decoded)

        a_result = await BuildUploadSessionAccess.increment_chunks_received_async(
            session=session, public_id=upload_id
        )

        if a_result.is_not_ok():
            logger.error(f"Error incrementing chunk count. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        upload = a_result.result()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=UploadChunkResult(
                uploadId=upload_id,
                chunkIndex=chunk_index,
                chunksReceived=upload.chunks_received,
                totalChunks=total_chunks,
            ),
        )

    @staticmethod
    async def complete_chunked_upload_async(
        session: AsyncSession,
        upload_id: str,
    ) -> AResult[CompleteUploadResult]:
        """Finalize a chunked upload and persist the build record."""

        a_result = await BuildUploadSessionAccess.get_by_public_id_async(
            session=session, public_id=upload_id
        )

        if a_result.is_not_ok():
            logger.error(f"Upload session not found. {a_result.info()}")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message=a_result.message(),
            )

        upload: BuildUploadSessionRow = a_result.result()

        if upload.chunks_received != upload.total_chunks:
            os.remove(upload.file_path)
            await BuildUploadSessionAccess.delete_by_public_id_async(
                session=session, public_id=upload_id
            )
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message=f"Incomplete upload. Expected {upload.total_chunks} chunks, got {upload.chunks_received}.",
            )

        a_result = await AdminVersionAccess.add_version_async(
            session=session,
            version=upload.version,
            apk_filename=upload.version_filename,
            description=upload.description,
        )

        if a_result.is_not_ok():
            os.remove(upload.file_path)
            await BuildUploadSessionAccess.delete_by_public_id_async(
                session=session, public_id=upload_id
            )
            logger.error(f"Error adding build. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        await BuildUploadSessionAccess.delete_by_public_id_async(
            session=session, public_id=upload_id
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=CompleteUploadResult(
                message="BUILD_UPLOAD_SUCCESS",
                publicId=a_result.result().public_id,
                filename=upload.version_filename,
            ),
        )

    @staticmethod
    async def upload_apk_single_async(
        session: AsyncSession,
        user_id: int,
        file_name: str,
        file_content: str,
        version: str,
        description: str | None,
    ) -> AResult[CompleteUploadResult]:
        """Upload an APK file in a single request (non-chunked)."""

        os.makedirs(BUILDS_PATH, exist_ok=True)

        file_ext = os.path.splitext(file_name)[1]
        version_filename = f"v{version}{file_ext}"
        file_path = os.path.join(BUILDS_PATH, version_filename)

        if os.path.exists(file_path):
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message=f"A build with filename '{version_filename}' already exists.",
            )

        try:
            decoded = base64.b64decode(file_content)
        except Exception:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Invalid base64 content.",
            )

        with open(file_path, "wb") as f:
            f.write(decoded)

        a_result = await AdminVersionAccess.add_version_async(
            session=session,
            version=version,
            apk_filename=version_filename,
            description=description,
        )

        if a_result.is_not_ok():
            os.remove(file_path)
            logger.error(f"Error adding build. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=CompleteUploadResult(
                message="BUILD_UPLOAD_SUCCESS",
                publicId=a_result.result().public_id,
                filename=version_filename,
            ),
        )
