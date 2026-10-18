from backend.core.framework.notification import (
    Notification,
    BUILD_PUBLISHED_NOTIFICATION,
)
from backend.core.responses.notificationResponses import (
    NotificationReplacement,
    NotificationDestination,
)
import tempfile
from backend.constants import TEMP_PATH
from backend.core.framework.storage import Storage
from backend.core.framework.uploadStaging import UploadStaging
from backend.core.access.uploadItemAccess import UploadItemAccess
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
from backend.constants import CHUNK_SIZE

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
        return await AdminVersionAccess.get_all_versions_async(session=session)

    @staticmethod
    async def add_version_async(
        session: AsyncSession,
        version: str,
        apk_filename: str,
        description: str | None = None,
    ) -> AResult[AppVersionRow]:
        logger.warning("Build content is required; upload an APK instead")
        return AResult(
            code=AResultCode.BAD_REQUEST,
            message="Upload APK content to register a build",
        )

    @staticmethod
    async def start_chunked_upload_async(
        session: AsyncSession,
        user_id: int,
        file_name: str,
        total_size: int,
        version: str,
        description: str | None,
    ) -> AResult[StartChunkedUploadResult]:
        if (
            total_size <= 0
            or total_size > 2 * 1024**3
            or not version.strip()
            or not file_name.lower().endswith(".apk")
        ):
            logger.warning("Invalid APK upload metadata")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid APK upload metadata"
            )
        total = (total_size + CHUNK_SIZE - 1) // CHUNK_SIZE
        upload_id = uuid.uuid4().hex
        created = await BuildUploadSessionAccess.create_async(
            session=session,
            public_id=upload_id,
            user_id=user_id,
            total_size=total_size,
            version=version,
            description=description,
            version_filename=f"v{version}.apk",
            total_chunks=total,
        )
        if created.is_not_ok():
            logger.error(created.info())
            return AResult(code=created.code(), message=created.message())
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=StartChunkedUploadResult(
                uploadId=upload_id, chunkSize=CHUNK_SIZE, totalChunks=total
            ),
        )

    @staticmethod
    async def upload_chunk_async(
        session: AsyncSession,
        upload_id: str,
        chunk_index: int,
        chunk_data: str,
        total_chunks: int,
        user_id: int | None = None,
    ) -> AResult[UploadChunkResult]:
        found = await BuildUploadSessionAccess.get_by_public_id_async(
            session=session, public_id=upload_id
        )
        if found.is_not_ok():
            logger.error(found.info())
            return AResult(code=found.code(), message=found.message())
        upload = found.result()
        if user_id is not None and upload.user_id != user_id:
            logger.warning("Build upload owner mismatch")
            return AResult(code=AResultCode.NOT_FOUND, message="Upload not found")
        if total_chunks != upload.total_chunks or not 0 <= chunk_index < total_chunks:
            logger.warning("Invalid APK chunk bounds")
            return AResult(code=AResultCode.BAD_REQUEST, message="Invalid chunk bounds")
        try:
            decoded = base64.b64decode(chunk_data, validate=True)
        except (ValueError, TypeError):
            logger.warning("Invalid chunk base64")
            return AResult(code=AResultCode.BAD_REQUEST, message="Invalid base64 chunk")
        expected = min(CHUNK_SIZE, upload.total_size - chunk_index * CHUNK_SIZE)
        if len(decoded) != expected:
            logger.warning("Invalid APK chunk size")
            return AResult(code=AResultCode.BAD_REQUEST, message="Invalid chunk size")
        stored = await Storage.upload_bytes_async(
            session=session, data=decoded, key=f"chunks/{chunk_index}"
        )
        if stored.is_not_ok():
            logger.error(stored.info())
            return AResult(code=stored.code(), message=stored.message())
        saved = await UploadItemAccess.save_async(
            session=session,
            upload_id=upload_id,
            user_id=upload.user_id,
            name=f"chunks/{chunk_index}",
            storage_object_id=stored.result().id,
        )
        if saved.is_not_ok():
            logger.error(saved.info())
            return AResult(code=saved.code(), message=saved.message())
        previous = saved.result()[1]
        if previous is not None:
            deleted = await Storage.delete_async(
                session=session, storage_object=previous
            )
            if deleted.is_not_ok():
                logger.error(deleted.info())
                return AResult(code=deleted.code(), message=deleted.message())
        items = await UploadItemAccess.list_async(
            session=session, upload_id=upload_id, user_id=upload.user_id
        )
        if items.is_not_ok():
            logger.error(items.info())
            return AResult(code=items.code(), message=items.message())
        upload.chunks_received = len(items.result())
        await session.flush()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=UploadChunkResult(
                uploadId=upload_id,
                chunkIndex=chunk_index,
                chunksReceived=upload.chunks_received,
                totalChunks=upload.total_chunks,
            ),
        )

    @staticmethod
    async def complete_chunked_upload_async(
        session: AsyncSession, upload_id: str, user_id: int | None = None
    ) -> AResult[CompleteUploadResult]:
        found = await BuildUploadSessionAccess.get_by_public_id_async(
            session=session, public_id=upload_id
        )
        if found.is_not_ok():
            logger.error(found.info())
            return AResult(code=found.code(), message=found.message())
        upload = found.result()
        if user_id is not None and upload.user_id != user_id:
            logger.warning("Build upload owner mismatch")
            return AResult(code=AResultCode.NOT_FOUND, message="Upload not found")
        with tempfile.TemporaryDirectory(dir=TEMP_PATH) as directory:
            assembled = await UploadStaging.assemble_async(
                session=session,
                upload_id=upload_id,
                user_id=upload.user_id,
                total=upload.total_chunks,
                output=os.path.join(directory, "build.apk"),
            )
            if assembled.is_not_ok():
                logger.error(assembled.info())
                return AResult(code=assembled.code(), message=assembled.message())
            if os.path.getsize(assembled.result()) != upload.total_size:
                logger.warning("APK upload size mismatch")
                return AResult(
                    code=AResultCode.BAD_REQUEST, message="APK size mismatch"
                )
            stored = await Storage.upload_file_async(
                session=session,
                path=assembled.result(),
                folder="builds",
                original_key=upload.version_filename,
                content_type="application/vnd.android.package-archive",
            )
        if stored.is_not_ok():
            logger.error(stored.info())
            return AResult(code=stored.code(), message=stored.message())
        version = await AdminVersionAccess.add_version_async(
            session=session,
            version=upload.version,
            apk_filename=upload.version_filename,
            description=upload.description,
            storage_object_id=stored.result().id,
        )
        if version.is_not_ok():
            logger.error(version.info())
            return AResult(code=version.code(), message=version.message())
        cleaned = await UploadStaging.clear_async(
            session=session, upload_id=upload_id, user_id=upload.user_id
        )
        if cleaned.is_not_ok():
            logger.error(cleaned.info())
            return AResult(code=cleaned.code(), message=cleaned.message())
        deleted = await BuildUploadSessionAccess.delete_by_public_id_async(
            session=session, public_id=upload_id
        )
        if deleted.is_not_ok():
            logger.error(deleted.info())
            return AResult(code=deleted.code(), message=deleted.message())
        notified = await Notification.emit_async(
            session=session,
            event=BUILD_PUBLISHED_NOTIFICATION,
            replacements=[
                NotificationReplacement(
                    key="VERSION",
                    value=version.result().version,
                )
            ],
            destination=NotificationDestination(path="/settings"),
        )
        if notified.is_not_ok():
            logger.error(notified.info())
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=CompleteUploadResult(
                message="BUILD_UPLOAD_SUCCESS",
                publicId=version.result().public_id,
                filename=version.result().apk_filename,
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
        try:
            data = base64.b64decode(file_content, validate=True)
        except (ValueError, TypeError):
            logger.warning("Invalid APK base64")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid base64 content"
            )
        if not data or not file_name.lower().endswith(".apk"):
            logger.warning("Invalid APK content")
            return AResult(code=AResultCode.BAD_REQUEST, message="Invalid APK content")
        stored = await Storage.upload_bytes_async(
            session=session,
            data=data,
            key=f"v{version}.apk",
            content_type="application/vnd.android.package-archive",
        )
        if stored.is_not_ok():
            logger.error(stored.info())
            return AResult(code=stored.code(), message=stored.message())
        added = await AdminVersionAccess.add_version_async(
            session=session,
            version=version,
            apk_filename=f"v{version}.apk",
            description=description,
            storage_object_id=stored.result().id,
        )
        if added.is_not_ok():
            logger.error(added.info())
            return AResult(code=added.code(), message=added.message())
        notified = await Notification.emit_async(
            session=session,
            event=BUILD_PUBLISHED_NOTIFICATION,
            replacements=[
                NotificationReplacement(
                    key="VERSION",
                    value=version,
                )
            ],
            destination=NotificationDestination(path="/settings"),
        )
        if notified.is_not_ok():
            logger.error(notified.info())
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=CompleteUploadResult(
                message="BUILD_UPLOAD_SUCCESS",
                publicId=added.result().public_id,
                filename=added.result().apk_filename,
            ),
        )
