"""S3 objects for persistent files; local paths are temporary processing inputs only."""

import asyncio
import mimetypes
import os
import tempfile
from collections.abc import AsyncGenerator, AsyncIterator, Generator
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path, PurePosixPath
from typing import Any, BinaryIO, cast

from botocore.exceptions import ClientError
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.background import BackgroundTask

from config import settings
from core.access.db.ormModels.storageObject import StorageObjectRow
from core.access.storageObjectAccess import StorageObjectAccess
from core.framework.storage import Storage, get_s3_client
from logger import logger
from result import Result, ResultCode


class ObjectFiles:
    @staticmethod
    def key(value: str) -> str:
        if (
            not value
            or "\x00" in value
            or value.startswith("/")
            or "\\" in value
            or any(part in {".", ".."} for part in value.split("/"))
        ):
            raise ValueError("Expected an S3 object key, not a local path")
        return str(PurePosixPath(value))

    @staticmethod
    def metadata(key: str) -> dict[str, Any]:
        try:
            return dict(
                get_s3_client().head_object(Bucket=settings.S3_BUCKET, Key=ObjectFiles.key(key))
            )
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
                raise FileNotFoundError(key) from error
            raise

    @staticmethod
    async def exists_async(key: str) -> bool:
        try:
            return int((await asyncio.to_thread(ObjectFiles.metadata, key))["ContentLength"]) > 0
        except (FileNotFoundError, ValueError):
            return False

    @staticmethod
    async def upload_async(
        session: AsyncSession, source: str, key: str
    ) -> Result[StorageObjectRow]:
        """Upload a processing file with bounded buffers and register its S3 key."""
        try:
            key = ObjectFiles.key(key)
            content_type = mimetypes.guess_type(key)[0] or "application/octet-stream"
            await Storage.ensure_bucket_async()
            await asyncio.to_thread(
                get_s3_client().upload_file,
                source,
                settings.S3_BUCKET,
                key,
                ExtraArgs={"ContentType": content_type},
            )
            metadata = await asyncio.to_thread(ObjectFiles.metadata, key)
            stored = await StorageObjectAccess.insert_object_async(
                session=session,
                bucket=settings.S3_BUCKET,
                key=key,
                content_type=content_type,
                size_bytes=int(metadata["ContentLength"]),
                etag=metadata.get("ETag"),
            )
            if stored.is_not_ok():
                logger.error("Cannot register S3 file: %s", stored.info())
                return Result(code=stored.code(), message=stored.message())
            return Result(code=ResultCode.OK, message="OK", result=stored.result())
        except Exception:
            logger.exception("Cannot upload persistent file to S3")
            return Result(code=ResultCode.GENERAL_ERROR, message="File upload failed")

    @staticmethod
    async def store_processing_result_async(source: str, key: str) -> None:
        """Publish a reproducible processing result to S3 without a database row."""
        key = ObjectFiles.key(key)
        await asyncio.to_thread(
            get_s3_client().upload_file,
            source,
            settings.S3_BUCKET,
            key,
            ExtraArgs={"ContentType": mimetypes.guess_type(key)[0] or "application/octet-stream"},
        )

    @staticmethod
    async def backup_async(key: str) -> str | None:
        """Retain the old download in S3 when deleting or retrying a group."""
        from uuid import uuid4

        key = ObjectFiles.key(key)
        backup = f"backups/{uuid4().hex}/{key}"
        try:
            await asyncio.to_thread(ObjectFiles.metadata, key)
        except FileNotFoundError:
            return None
        await asyncio.to_thread(
            get_s3_client().copy_object,
            Bucket=settings.S3_BUCKET,
            Key=backup,
            CopySource={"Bucket": settings.S3_BUCKET, "Key": key},
        )
        return backup

    @staticmethod
    async def archive_async(key: str) -> str | None:
        backup = await ObjectFiles.backup_async(key)
        await ObjectFiles.delete_async(key)
        return backup

    @staticmethod
    async def delete_async(key: str) -> None:
        await asyncio.to_thread(
            get_s3_client().delete_object, Bucket=settings.S3_BUCKET, Key=ObjectFiles.key(key)
        )

    @staticmethod
    @asynccontextmanager
    async def local_copy_async(key: str) -> AsyncGenerator[str]:
        """Materialize an object only for the lifetime of a local processing operation."""
        key = ObjectFiles.key(key)
        os.makedirs(settings.TEMP_PATH, exist_ok=True)
        with tempfile.TemporaryDirectory(
            prefix="rockit-object-", dir=settings.TEMP_PATH
        ) as directory:
            path = str(Path(directory) / ("source" + PurePosixPath(key).suffix))
            await asyncio.to_thread(get_s3_client().download_file, settings.S3_BUCKET, key, path)
            yield path

    @staticmethod
    @contextmanager
    def open_file(key: str) -> Generator[BinaryIO]:
        """Provide seekable temporary input for tag extraction and ZIP construction."""
        os.makedirs(settings.TEMP_PATH, exist_ok=True)
        with tempfile.TemporaryFile(dir=settings.TEMP_PATH) as handle:
            get_s3_client().download_fileobj(settings.S3_BUCKET, ObjectFiles.key(key), handle)
            handle.seek(0)
            yield cast(BinaryIO, handle)

    @staticmethod
    async def stream_async(
        key: str,
        range_header: str | None = None,
        media_type: str | None = None,
    ) -> Result[StreamingResponse]:
        try:
            key = ObjectFiles.key(key)
            metadata = await asyncio.to_thread(ObjectFiles.metadata, key)
            size = int(metadata["ContentLength"])
            start, end, status = 0, size - 1, 200
            headers = {"Accept-Ranges": "bytes"}
            if range_header:
                try:
                    unit, value = range_header.split("=", 1)
                    first, last = value.split("-", 1)
                    valid = unit.lower() == "bytes" and "," not in value
                    if first:
                        start = int(first)
                        end = min(int(last), size - 1) if last else size - 1
                    else:
                        suffix = int(last)
                        valid = valid and suffix > 0
                        start = max(0, size - suffix)
                    valid = valid and 0 <= start < size and start <= end
                except ValueError:
                    valid = False
                if not valid:
                    return Result(
                        code=ResultCode.OK,
                        message="Unsatisfiable range",
                        result=StreamingResponse(
                            iter(()),
                            status_code=416,
                            headers={
                                "Content-Range": f"bytes */{size}",
                                "Content-Length": "0",
                                "Accept-Ranges": "bytes",
                            },
                        ),
                    )
                status = 206
                headers["Content-Range"] = f"bytes {start}-{end}/{size}"
            headers["Content-Length"] = str(max(0, end - start + 1))
            # Open before returning so storage errors produce an HTTP error.
            arguments: dict[str, Any] = {"Bucket": settings.S3_BUCKET, "Key": key}
            if status == 206:
                arguments["Range"] = f"bytes={start}-{end}"
            response = await asyncio.to_thread(get_s3_client().get_object, **arguments)
            body = response["Body"]

            async def chunks() -> AsyncIterator[bytes]:
                try:
                    while chunk := await asyncio.to_thread(body.read, 64 * 1024):
                        yield chunk
                finally:
                    await asyncio.to_thread(body.close)

            return Result(
                code=ResultCode.OK,
                message="OK",
                result=StreamingResponse(
                    chunks(),
                    status_code=status,
                    headers=headers,
                    background=BackgroundTask(body.close),
                    media_type=media_type
                    or metadata.get("ContentType")
                    or mimetypes.guess_type(key)[0],
                ),
            )
        except (FileNotFoundError, ValueError):
            logger.warning("Stored file not found: %s", key)
            return Result(code=ResultCode.NOT_FOUND, message="File not found")
        except Exception:
            logger.exception("Cannot stream S3 file: %s", key)
            return Result(code=ResultCode.GENERAL_ERROR, message="File unavailable")

    @staticmethod
    async def start_multipart_async(key: str) -> str:
        await Storage.ensure_bucket_async()
        response = await asyncio.to_thread(
            get_s3_client().create_multipart_upload,
            Bucket=settings.S3_BUCKET,
            Key=ObjectFiles.key(key),
            ContentType="application/vnd.android.package-archive",
        )
        return response["UploadId"]

    @staticmethod
    async def upload_part_async(key: str, upload_id: str, number: int, data: bytes) -> None:
        await asyncio.to_thread(
            get_s3_client().upload_part,
            Bucket=settings.S3_BUCKET,
            Key=ObjectFiles.key(key),
            UploadId=upload_id,
            PartNumber=number,
            Body=data,
        )

    @staticmethod
    async def multipart_parts_async(key: str, upload_id: str) -> list[dict[str, Any]]:
        def collect() -> list[dict[str, Any]]:
            parts: list[dict[str, Any]] = []
            paginator = get_s3_client().get_paginator("list_parts")
            for page in paginator.paginate(
                Bucket=settings.S3_BUCKET, Key=ObjectFiles.key(key), UploadId=upload_id
            ):
                parts.extend(
                    {"PartNumber": part["PartNumber"], "ETag": part["ETag"]}
                    for part in page.get("Parts", [])
                    if "PartNumber" in part and "ETag" in part
                )
            return parts

        return await asyncio.to_thread(collect)

    @staticmethod
    async def complete_multipart_async(
        key: str, upload_id: str, parts: list[dict[str, Any]]
    ) -> None:
        client: Any = get_s3_client()
        await asyncio.to_thread(
            client.complete_multipart_upload,
            Bucket=settings.S3_BUCKET,
            Key=ObjectFiles.key(key),
            UploadId=upload_id,
            MultipartUpload={"Parts": parts},
        )

    @staticmethod
    async def abort_multipart_async(key: str, upload_id: str) -> None:
        await asyncio.to_thread(
            get_s3_client().abort_multipart_upload,
            Bucket=settings.S3_BUCKET,
            Key=ObjectFiles.key(key),
            UploadId=upload_id,
        )
