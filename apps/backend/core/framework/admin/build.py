import base64
import os
import tempfile
import uuid
from dataclasses import dataclass
from logging import Logger
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from constants import CHUNK_SIZE, TEMP_PATH
from core.access.adminVersionAccess import AdminVersionAccess
from core.access.buildUploadSessionAccess import BuildUploadSessionAccess
from core.access.db.ormModels.appVersion import AppVersionRow
from core.access.storageObjectAccess import StorageObjectAccess
from core.framework.objectFiles import ObjectFiles
from core.framework.storage import Storage
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode

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
    ) -> Result[list[AppVersionRow]]:
        """Get all build versions."""

        a_result = await AdminVersionAccess.get_all_versions_async(session=session)
        if a_result.is_not_ok():
            logger.error(f"Error fetching builds. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())
        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def add_version_async(
        session: AsyncSession,
        version: str,
        apk_filename: str,
        description: str | None = None,
    ) -> Result[AppVersionRow]:
        """Add a new build version."""

        stored = await Storage.get_object_from_key_async(
            session=session, key=f"builds/{apk_filename}"
        )
        if stored.is_not_ok():
            return Result(code=stored.code(), message=stored.message())
        a_result = await AdminVersionAccess.add_version_async(
            session=session,
            version=version,
            apk_filename=apk_filename,
            storage_object_id=stored.result().id,
            description=description,
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding build. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())
        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    @safe_async
    async def start_chunked_upload_async(
        session: AsyncSession,
        user_id: int,
        file_name: str,
        total_size: int,
        version: str,
        description: str | None,
    ) -> Result[StartChunkedUploadResult]:
        """Store an S3 multipart upload handle; no local assembly path is persisted."""
        chunk_size = max(CHUNK_SIZE, 5 * 1024 * 1024)
        total_chunks = (total_size + chunk_size - 1) // chunk_size
        if not 1 <= total_chunks <= 10000:
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid upload size")
        version_filename = f"v{version}{os.path.splitext(file_name)[1]}"
        key = ObjectFiles.key(f"builds/{version_filename}")
        if await ObjectFiles.exists_async(key):
            return Result(code=ResultCode.BAD_REQUEST, message="Build already exists")
        stored = await StorageObjectAccess.insert_object_async(
            session=session,
            bucket=settings.S3_BUCKET,
            key=key,
            content_type="application/vnd.android.package-archive",
        )
        if stored.is_not_ok():
            return Result(code=stored.code(), message=stored.message())
        multipart_id = await ObjectFiles.start_multipart_async(key)
        public_id = str(uuid.uuid4())
        created = await BuildUploadSessionAccess.create_async(
            session=session,
            public_id=public_id,
            user_id=user_id,
            storage_object_id=stored.result().id,
            multipart_upload_id=multipart_id,
            version=version,
            description=description,
            version_filename=version_filename,
            total_chunks=total_chunks,
        )
        if created.is_not_ok():
            await ObjectFiles.abort_multipart_async(key, multipart_id)
            return Result(code=created.code(), message=created.message())
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=StartChunkedUploadResult(
                uploadId=public_id,
                chunkSize=chunk_size,
                totalChunks=total_chunks,
            ),
        )

    @staticmethod
    @safe_async
    async def upload_chunk_async(
        session: AsyncSession,
        upload_id: str,
        chunk_index: int,
        chunk_data: str,
        total_chunks: int,
    ) -> Result[UploadChunkResult]:
        found = await BuildUploadSessionAccess.get_by_public_id_async(
            session=session, public_id=upload_id
        )
        if found.is_not_ok():
            return Result(code=found.code(), message=found.message())
        upload = found.result()
        if total_chunks != upload.total_chunks or not 0 <= chunk_index < total_chunks:
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid chunk index or count")
        try:
            decoded = base64.b64decode(chunk_data, validate=True)
        except ValueError:
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid base64 chunk data")
        size = max(CHUNK_SIZE, 5 * 1024 * 1024)
        if (
            not decoded
            or len(decoded) > size
            or (chunk_index < total_chunks - 1 and len(decoded) != size)
        ):
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid chunk size")
        key = upload.storage_object.key
        await ObjectFiles.upload_part_async(
            key, upload.multipart_upload_id, chunk_index + 1, decoded
        )
        parts = await ObjectFiles.multipart_parts_async(key, upload.multipart_upload_id)
        updated = await BuildUploadSessionAccess.set_chunks_received_async(
            session=session,
            public_id=upload_id,
            count=len(parts),
        )
        if updated.is_not_ok():
            return Result(code=updated.code(), message=updated.message())
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=UploadChunkResult(
                uploadId=upload_id,
                chunkIndex=chunk_index,
                chunksReceived=len(parts),
                totalChunks=total_chunks,
            ),
        )

    @staticmethod
    @safe_async
    async def complete_chunked_upload_async(
        session: AsyncSession,
        upload_id: str,
    ) -> Result[CompleteUploadResult]:
        found = await BuildUploadSessionAccess.get_by_public_id_async(
            session=session, public_id=upload_id
        )
        if found.is_not_ok():
            return Result(code=found.code(), message=found.message())
        upload = found.result()
        key = upload.storage_object.key
        parts = await ObjectFiles.multipart_parts_async(key, upload.multipart_upload_id)
        if [part["PartNumber"] for part in parts] != list(range(1, upload.total_chunks + 1)):
            return Result(code=ResultCode.BAD_REQUEST, message="Incomplete upload")
        await ObjectFiles.complete_multipart_async(key, upload.multipart_upload_id, parts)
        import asyncio

        metadata = await asyncio.to_thread(ObjectFiles.metadata, key)
        registered = await StorageObjectAccess.insert_object_async(
            session=session,
            bucket=upload.storage_object.bucket,
            key=key,
            content_type="application/vnd.android.package-archive",
            size_bytes=int(metadata["ContentLength"]),
            etag=metadata.get("ETag"),
        )
        if registered.is_not_ok():
            return Result(code=registered.code(), message=registered.message())
        version = await AdminVersionAccess.add_version_async(
            session=session,
            version=upload.version,
            apk_filename=upload.version_filename,
            storage_object_id=registered.result().id,
            description=upload.description,
        )
        if version.is_not_ok():
            return Result(code=version.code(), message=version.message())
        await BuildUploadSessionAccess.delete_by_public_id_async(
            session=session, public_id=upload_id
        )
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=CompleteUploadResult(
                message="BUILD_UPLOAD_SUCCESS",
                publicId=version.result().public_id,
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
    ) -> Result[CompleteUploadResult]:
        """Upload an APK file in a single request (non-chunked)."""

        os.makedirs(TEMP_PATH, exist_ok=True)

        file_ext = os.path.splitext(file_name)[1]
        version_filename = f"v{version}{file_ext}"
        key = f"builds/{version_filename}"

        if await ObjectFiles.exists_async(key):
            return Result(
                code=ResultCode.BAD_REQUEST,
                message=f"A build with filename '{version_filename}' already exists.",
            )

        try:
            decoded = base64.b64decode(file_content)
        except Exception:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Invalid base64 content.",
            )

        with tempfile.NamedTemporaryFile(prefix="rockit-build-", dir=TEMP_PATH) as staging:
            staging.write(decoded)
            staging.flush()
            uploaded = await ObjectFiles.upload_async(session=session, source=staging.name, key=key)
        if uploaded.is_not_ok():
            return Result(code=uploaded.code(), message=uploaded.message())

        a_result = await AdminVersionAccess.add_version_async(
            session=session,
            version=version,
            apk_filename=version_filename,
            storage_object_id=uploaded.result().id,
            description=description,
        )

        if a_result.is_not_ok():
            await ObjectFiles.delete_async(key)
            logger.error(f"Error adding build. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=CompleteUploadResult(
                message="BUILD_UPLOAD_SUCCESS",
                publicId=a_result.result().public_id,
                filename=version_filename,
            ),
        )
