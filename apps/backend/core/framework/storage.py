from typing import TypedDict, Any
from collections.abc import AsyncIterator
from sqlalchemy.orm import SessionTransaction

"""Durable S3 objects, bounded transfers, and exact HTTP byte ranges."""

import asyncio
import hashlib
import mimetypes
import os
import tempfile
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

from botocore.exceptions import ClientError
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import event
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession

from backend import constants
from backend.core.aResult import AResult, AResultCode
from backend.core.access.objectStore import get_s3_client
from backend.core.access.storageObjectAccess import StorageObjectAccess
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from backend.utils.logger import getLogger

logger = getLogger(__name__)
CHUNK_SIZE = 1024 * 1024


def parse_range(value: str | None, size: int) -> tuple[int, int, int] | None:
    """Return inclusive single-byte bounds, or None for an unsatisfiable range."""
    if value is None:
        return 0, size - 1, 200
    try:
        unit, bounds = value.split("=", 1)
        if unit.strip().lower() != "bytes" or "," in bounds:
            return None
        first, last = bounds.strip().split("-", 1)
        if first:
            if not first.isdecimal() or (last and not last.isdecimal()):
                return None
            start, end = int(first), min(int(last), size - 1) if last else size - 1
        else:
            if not last.isdecimal() or int(last) <= 0:
                return None
            start, end = max(0, size - int(last)), size - 1
        return (start, end, 206) if 0 <= start <= end < size else None
    except (ValueError, OverflowError):
        return None


def _hash_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(file=path, mode="rb") as source:
        while block := source.read(CHUNK_SIZE):
            digest.update(block)
    return digest.hexdigest()


class _ObjectJournal(TypedDict):
    new: list[tuple[str, str]]
    delete: list[tuple[str, str]]


def _object_journal(session: Session) -> _ObjectJournal:
    transaction = session.get_nested_transaction() or session.get_transaction()
    return session.info.setdefault("s3_transactions", {}).setdefault(
        transaction, {"new": [], "delete": []}
    )


def _remove_objects(objects: list[tuple[str, str]]) -> None:
    for bucket, key in objects:
        try:
            get_s3_client().delete_object(Bucket=bucket, Key=key)
        except Exception:
            # Metadata remains authoritative; the storage audit reports failed cleanup.
            logger.exception("Could not clean up object %s", key)


@event.listens_for(Session, "after_commit")
def _commit_objects(session: Session) -> None:
    transaction = session.get_nested_transaction() or session.get_transaction()
    journal = session.info.get("s3_transactions", {}).pop(transaction, None)
    if journal is None:
        return
    if transaction is not None and transaction.nested:
        parent = session.info.setdefault("s3_transactions", {}).setdefault(
            transaction.parent, {"new": [], "delete": []}
        )
        parent["new"].extend(journal["new"])
        parent["delete"].extend(journal["delete"])
    else:
        _remove_objects(objects=journal["delete"])


@event.listens_for(Session, "after_transaction_end")
def _rollback_objects(session: Session, transaction: SessionTransaction) -> None:
    # Committed transactions were consumed above. Rollback and close both get here,
    # including savepoints; compensation is isolated to that transaction's keys.
    journal = session.info.get("s3_transactions", {}).pop(transaction, None)
    if journal is not None:
        _remove_objects(objects=journal["new"])


class Storage:
    @staticmethod
    async def ensure_bucket_async() -> AResultCode:
        """Create an S3-compatible bucket when absent; propagate readiness failures."""
        client = get_s3_client()
        try:
            try:
                await asyncio.to_thread(client.head_bucket, Bucket=constants.S3_BUCKET)
            except ClientError as error:
                if error.response.get("Error", {}).get("Code", "") not in (
                    "404",
                    "NoSuchBucket",
                ):
                    raise
                options: dict[str, Any] = (
                    {}
                    if constants.S3_REGION == "us-east-1"
                    else {
                        "CreateBucketConfiguration": {
                            "LocationConstraint": constants.S3_REGION
                        }
                    }
                )
                await asyncio.to_thread(
                    client.create_bucket, Bucket=constants.S3_BUCKET, **options
                )
            return AResultCode(code=AResultCode.OK, message="OK")
        except Exception:
            logger.exception("Object storage is unavailable")
            return AResultCode(
                code=AResultCode.CONFIGURATION_ERROR,
                message="Object storage is unavailable",
            )

    @staticmethod
    async def upload_file_async(
        session: AsyncSession,
        path: str,
        folder: str = "media",
        original_key: str | None = None,
        content_type: str | None = None,
    ) -> AResult[StorageObjectRow]:
        """Upload a file with multipart transfer, then register verified immutable metadata."""
        if not session.in_transaction():
            await session.begin()
        key = f"{folder.strip('/')}/{uuid4().hex}{Path(path).suffix.lower()}"
        client = get_s3_client()
        try:
            content_type = (
                content_type
                or mimetypes.guess_type(path)[0]
                or "application/octet-stream"
            )
            checksum = await asyncio.to_thread(_hash_file, path=path)
            size = os.path.getsize(path)
            await asyncio.to_thread(
                client.upload_file,
                Filename=path,
                Bucket=constants.S3_BUCKET,
                Key=key,
                ExtraArgs={
                    "ContentType": content_type,
                    "Metadata": {"sha256": checksum},
                },
            )
            _object_journal(session=session.sync_session)["new"].append(
                (constants.S3_BUCKET, key)
            )
            head = await asyncio.to_thread(
                client.head_object, Bucket=constants.S3_BUCKET, Key=key
            )
            if (
                head["ContentLength"] != size
                or head.get("Metadata", {}).get("sha256") != checksum
            ):
                raise ValueError("Uploaded object metadata does not match source")
            row = StorageObjectRow(
                bucket=constants.S3_BUCKET,
                key=key,
                public_id=uuid4().hex,
                original_key=original_key or Path(path).name,
                content_type=content_type,
                size_bytes=size,
                etag=head.get("ETag"),
            )
            row.sha256 = checksum
            result = await StorageObjectAccess.register_async(session=session, row=row)
            if result.is_not_ok():
                await asyncio.to_thread(
                    client.delete_object, Bucket=constants.S3_BUCKET, Key=key
                )
            return result
        except Exception:
            logger.exception("Could not publish file to object storage")
            try:
                await asyncio.to_thread(
                    client.delete_object, Bucket=constants.S3_BUCKET, Key=key
                )
            except Exception:
                logger.exception("Could not remove failed upload")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Could not publish file"
            )

    @staticmethod
    async def upload_bytes_async(
        session: AsyncSession, data: bytes, key: str, content_type: str | None = None
    ) -> AResult[StorageObjectRow]:
        """Stage a bounded image/chunk payload and reuse the file transfer lifecycle."""
        os.makedirs(name=constants.TEMP_PATH, exist_ok=True)
        fd, path = tempfile.mkstemp(suffix=Path(key).suffix, dir=constants.TEMP_PATH)
        try:
            with os.fdopen(fd, "wb") as target:
                target.write(data)
            return await Storage.upload_file_async(
                session=session,
                path=path,
                folder="uploads",
                original_key=key,
                content_type=content_type,
            )
        finally:
            os.unlink(path)

    @staticmethod
    async def materialize_async(storage_object: StorageObjectRow) -> AResult[str]:
        """Download to disposable scratch space for FFmpeg, image processing, or ZIPs."""
        os.makedirs(name=constants.TEMP_PATH, exist_ok=True)
        fd, path = tempfile.mkstemp(
            suffix=Path(storage_object.key).suffix, dir=constants.TEMP_PATH
        )
        os.close(fd)
        try:
            await asyncio.to_thread(
                get_s3_client().download_file,
                Bucket=storage_object.bucket,
                Key=storage_object.key,
                Filename=path,
            )
            if (
                storage_object.sha256
                and await asyncio.to_thread(_hash_file, path=path)
                != storage_object.sha256
            ):
                raise ValueError("Object checksum mismatch")
            return AResult(code=AResultCode.OK, message="OK", result=path)
        except Exception:
            os.unlink(path)
            logger.exception("Could not read stored object")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Stored object unavailable"
            )

    @staticmethod
    async def materialize_uri_async(uri: str) -> AResult[str]:
        """Resolve internal compatibility locators without persisting local paths."""
        parsed = urlsplit(uri)
        if parsed.scheme != "s3" or parsed.netloc != constants.S3_BUCKET:
            logger.warning("Invalid storage locator")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid storage locator"
            )
        return await Storage.materialize_async(
            storage_object=StorageObjectRow(
                bucket=parsed.netloc, key=parsed.path.lstrip("/")
            )
        )

    @staticmethod
    async def stream_async(
        storage_object: StorageObjectRow | None,
        range_header: str | None = None,
        head_only: bool = False,
        filename: str | None = None,
    ) -> AResult[Response]:
        """Stream exact ranges from S3, closing transport bodies even after cancellation."""
        if storage_object is None:
            logger.warning("No stored content")
            return AResult(code=AResultCode.NOT_FOUND, message="Content not available")
        client = get_s3_client()
        body = None
        try:
            metadata = await asyncio.to_thread(
                client.head_object, Bucket=storage_object.bucket, Key=storage_object.key
            )
            size = metadata["ContentLength"]
            bounds = parse_range(value=None if head_only else range_header, size=size)
            headers = {
                "Accept-Ranges": "bytes",
                "ETag": metadata.get("ETag", ""),
                "Content-Type": metadata.get("ContentType")
                or "application/octet-stream",
            }
            if filename:
                from urllib.parse import quote

                headers["Content-Disposition"] = (
                    "attachment; filename*=UTF-8''" + quote(filename, safe="")
                )
            if bounds is None:
                headers.update(
                    {"Content-Range": f"bytes */{size}", "Content-Length": "0"}
                )
                return AResult(
                    code=AResultCode.OK,
                    message="OK",
                    result=Response(status_code=416, headers=headers),
                )
            start, end, status = bounds
            headers["Content-Length"] = str(max(0, end - start + 1))
            if status == 206:
                headers["Content-Range"] = f"bytes {start}-{end}/{size}"
            if head_only or size == 0:
                return AResult(
                    code=AResultCode.OK,
                    message="OK",
                    result=Response(status_code=status, headers=headers),
                )
            options: dict[str, Any] = (
                {"Range": f"bytes={start}-{end}"} if status == 206 else {}
            )
            remote = await asyncio.to_thread(
                client.get_object,
                Bucket=storage_object.bucket,
                Key=storage_object.key,
                **options,
            )
            body = remote["Body"]

            remote_body = body

            async def chunks() -> AsyncIterator[bytes]:
                try:
                    while block := await asyncio.to_thread(
                        remote_body.read, CHUNK_SIZE
                    ):
                        yield block
                finally:
                    await asyncio.to_thread(remote_body.close)

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=StreamingResponse(
                    content=chunks(), status_code=status, headers=headers
                ),
            )
        except ClientError as error:
            logger.warning(
                "Stored content request failed: %s",
                error.response.get("Error", {}).get("Code", ""),
            )
            code = (
                AResultCode.NOT_FOUND
                if error.response.get("Error", {}).get("Code", "")
                in ("404", "NoSuchKey", "NoSuchBucket")
                else AResultCode.GENERAL_ERROR
            )
            return AResult(code=code, message="Stored content unavailable")
        except Exception:
            if body is not None:
                body.close()
            logger.exception("Could not stream stored content")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Could not stream stored content",
            )

    @staticmethod
    def get_object_url(storage_object: StorageObjectRow) -> str:
        """Sign using the externally reachable endpoint; never persist the result."""
        return get_s3_client(public=True).generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": storage_object.bucket, "Key": storage_object.key},
            ExpiresIn=constants.S3_PRESIGNED_URL_EXPIRES,
        )

    @staticmethod
    async def stream_uri_async(
        uri: str | None, range_header: str | None = None, head_only: bool = False
    ) -> AResult[Response]:
        if not uri:
            logger.warning("Content not downloaded")
            return AResult(code=AResultCode.NOT_FOUND, message="Content not downloaded")
        parsed = urlsplit(uri)
        if parsed.scheme != "s3" or parsed.netloc != constants.S3_BUCKET:
            logger.warning("Invalid storage locator")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid storage locator"
            )
        return await Storage.stream_async(
            storage_object=StorageObjectRow(
                bucket=parsed.netloc, key=parsed.path.lstrip("/")
            ),
            range_header=range_header,
            head_only=head_only,
        )

    @staticmethod
    async def delete_async(
        session: AsyncSession, storage_object: StorageObjectRow
    ) -> AResultCode:
        """Enforce all foreign keys before scheduling physical deletion after commit."""
        bucket, key = storage_object.bucket, storage_object.key
        result = await StorageObjectAccess.delete_async(
            session=session, row=storage_object
        )
        if result.is_ok():
            _object_journal(session=session.sync_session)["delete"].append(
                (bucket, key)
            )
        return result
