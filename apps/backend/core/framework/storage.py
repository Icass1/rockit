from __future__ import annotations

import asyncio
import os
from collections.abc import Callable
from typing import TYPE_CHECKING, Any, cast

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, EndpointConnectionError
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.access.db.ormModels.storageObject import StorageObjectRow
from core.access.storageObjectAccess import StorageObjectAccess
from core.utils.createId import create_id
from logger import logger
from result import Result as Result
from result import ResultCode as ResultCode

if TYPE_CHECKING:
    from mypy_boto3_s3.client import S3Client
    from mypy_boto3_s3.type_defs import PutObjectOutputTypeDef


_private_client: S3Client | None = None
_public_client: S3Client | None = None
_bucket_ready: bool = False


def _get_endpoint_url(public: bool) -> str | None:
    """Return the configured endpoint for backend or client-facing access."""

    if public:
        return settings.S3_PUBLIC_ENDPOINT_URL or settings.S3_PRIVATE_ENDPOINT_URL
    return settings.S3_PRIVATE_ENDPOINT_URL


def get_s3_client(public: bool = False) -> S3Client:
    """Return a cached private or public S3 client."""

    global _private_client, _public_client
    client: S3Client | None = _public_client if public else _private_client
    if client is None:
        boto3_module: Any = boto3
        client_factory = cast(Callable[..., Any], boto3_module.client)
        endpoint_url = _get_endpoint_url(public=public)
        client = client_factory(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.S3_ACCESS_KEY or None,
            aws_secret_access_key=settings.S3_SECRET_KEY or None,
            region_name=settings.S3_REGION or None,
            config=Config(
                signature_version="s3v4",
                # AWS presigning must use the bucket's regional endpoint.
                # Custom S3-compatible endpoints retain automatic addressing.
                s3={"addressing_style": "virtual" if endpoint_url is None else "auto"},
            ),
        )
        if public:
            _public_client = client
        else:
            _private_client = client
    assert client is not None
    return client


def _ensure_bucket() -> None:
    """Create the configured bucket if it does not exist yet (idempotent)."""

    global _bucket_ready
    if _bucket_ready:
        return

    client: S3Client = get_s3_client()
    try:
        client.head_bucket(Bucket=settings.S3_BUCKET)
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in (
            "404",
            "NoSuchBucket",
            "NoSuchKey",
        ):
            create_kwargs: dict[str, Any] = {}
            region: str | None = client.meta.region_name
            if region and region != "us-east-1":
                create_kwargs["CreateBucketConfiguration"] = {"LocationConstraint": region}
            client.create_bucket(Bucket=settings.S3_BUCKET, **create_kwargs)
        else:
            raise
    except EndpointConnectionError as e:
        logger.error(
            f"Could not connect to object storage endpoint {_get_endpoint_url(public=False)} "
            f"while checking bucket '{settings.S3_BUCKET}'. ({e})"
        )
        return

    _bucket_ready = True


def _put_object(
    data: bytes,
    key: str,
    content_type: str | None = None,
) -> PutObjectOutputTypeDef:
    client: S3Client = get_s3_client()
    put_kwargs: dict[str, Any] = {
        "Bucket": settings.S3_BUCKET,
        "Key": key,
        "Body": data,
    }
    if content_type is not None:
        put_kwargs["ContentType"] = content_type
    return client.put_object(**put_kwargs)


def _object_exists(bucket: str, key: str) -> bool:
    client: S3Client = get_s3_client()
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in (
            "404",
            "NoSuchKey",
            "NoSuchBucket",
        ):
            return False
        raise
    except EndpointConnectionError as e:
        logger.error(
            f"Could not connect to object storage endpoint {_get_endpoint_url(public=False)} "
            f"while checking object '{key}'. ({e})"
        )
        return False


def _delete_object(bucket: str, key: str) -> None:
    client: S3Client = get_s3_client()
    client.delete_object(Bucket=bucket, Key=key)


def _download_object(bucket: str, key: str) -> bytes:
    client: S3Client = get_s3_client()
    response = client.get_object(Bucket=bucket, Key=key)
    return response["Body"].read()


class Storage:
    @staticmethod
    async def get_all_objects_async(
        session: AsyncSession,
    ) -> Result[list[StorageObjectRow]]:
        """Get all registered storage objects."""

        return await StorageObjectAccess.get_all_objects_async(session=session)

    @staticmethod
    def get_object_url(storage_object: StorageObjectRow) -> str | None:
        """Return a short-lived URL that can be used to download a stored object."""

        try:
            client: S3Client = get_s3_client(public=True)
            return client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": storage_object.bucket,
                    "Key": storage_object.key,
                },
                ExpiresIn=settings.S3_PRESIGNED_URL_EXPIRES,
            )
        except Exception as e:
            logger.error(
                f"Error generating object URL for {storage_object.key}: {e}",
                exc_info=True,
            )
            return None

    @staticmethod
    async def ensure_bucket_async() -> None:
        """Ensure the configured bucket exists (idempotent). Safe to call on startup."""

        if not settings.S3_BUCKET:
            return
        try:
            await asyncio.to_thread(_ensure_bucket)
        except Exception as e:
            logger.error(f"Error ensuring bucket '{settings.S3_BUCKET}': {e}")

    @staticmethod
    async def upload_bytes_async(
        session: AsyncSession,
        data: bytes,
        key: str,
        content_type: str | None = None,
        original_key: str | None = None,
    ) -> Result[StorageObjectRow]:
        """Upload raw bytes to object storage and register the uploaded object in the DB."""

        try:
            await Storage.ensure_bucket_async()

            response: PutObjectOutputTypeDef = await asyncio.to_thread(
                _put_object,
                data=data,
                key=key,
                content_type=content_type,
            )
            etag: str | None = response.get("ETag")

            a_result: Result[StorageObjectRow] = await StorageObjectAccess.insert_object_async(
                session=session,
                bucket=settings.S3_BUCKET,
                key=key,
                content_type=content_type,
                size_bytes=len(data),
                etag=etag,
                original_key=original_key,
            )
            if a_result.is_not_ok():
                logger.error(f"Error inserting storage object for key {key}. {a_result.info()}")
                await asyncio.to_thread(_delete_object, bucket=settings.S3_BUCKET, key=key)

            return a_result

        except Exception as e:
            logger.error(f"Error uploading object with key {key}: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message=f"Error uploading object {key}")

    @staticmethod
    async def download_bytes_async(
        session: AsyncSession,
        storage_object: StorageObjectRow,
    ) -> Result[bytes]:
        """Download the bytes of an uploaded object from object storage."""

        try:
            data: bytes = await asyncio.to_thread(
                _download_object,
                bucket=storage_object.bucket,
                key=storage_object.key,
            )
            return Result(code=ResultCode.OK, message="OK", result=data)

        except Exception as e:
            logger.error(f"Error downloading object {storage_object.key}: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error downloading object")

    @staticmethod
    async def delete_object_async(
        session: AsyncSession,
        storage_object: StorageObjectRow,
    ) -> ResultCode:
        """Delete an object from object storage and remove its DB row."""

        try:
            await asyncio.to_thread(
                _delete_object,
                bucket=storage_object.bucket,
                key=storage_object.key,
            )

            a_result: ResultCode = await StorageObjectAccess.delete_object_async(
                session=session,
                storage_object_id=storage_object.id,
            )
            if a_result.is_not_ok():
                logger.error(f"Error deleting storage object row. {a_result.info()}")

            return a_result

        except Exception as e:
            logger.error(f"Error deleting object {storage_object.key}: {e}", exc_info=True)
            return ResultCode(
                code=ResultCode.GENERAL_ERROR,
                message="Error deleting object",
            )

    @staticmethod
    async def object_exists_async(bucket: str, key: str) -> bool:
        """Return True if the object exists in object storage (catches missing buckets)."""

        try:
            return await asyncio.to_thread(_object_exists, bucket=bucket, key=key)
        except Exception as e:
            logger.error(f"Error checking object {key} in bucket {bucket}: {e}", exc_info=True)
            return False

    @staticmethod
    async def restore_object_async(
        data: bytes,
        key: str,
        content_type: str | None = None,
    ) -> bool:
        """Re-upload bytes under an existing key without touching the DB.

        Used to self-heal when a DB row exists but the storage object was
        removed externally (e.g. an object storage data reset).
        """

        try:
            await Storage.ensure_bucket_async()
            await asyncio.to_thread(
                _put_object,
                data=data,
                key=key,
                content_type=content_type,
            )
            return True
        except Exception as e:
            logger.error(f"Error restoring object with key {key}: {e}", exc_info=True)
            return False

    @staticmethod
    async def get_object_from_key_async(
        session: AsyncSession,
        key: str,
    ) -> Result[StorageObjectRow]:
        """Get the DB row of an uploaded object by its object storage key."""

        return await StorageObjectAccess.get_object_from_key_async(session=session, key=key)

    @staticmethod
    async def get_object_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> Result[StorageObjectRow]:
        """Get the DB row of an uploaded object by its public ID."""

        return await StorageObjectAccess.get_object_from_public_id_async(
            session=session, public_id=public_id
        )

    @staticmethod
    async def get_presigned_url_async(
        storage_object: StorageObjectRow | None,
    ) -> Result[str]:
        """Return a short-lived presigned URL for a private object."""

        if storage_object is None:
            return Result[str](
                code=ResultCode.NOT_FOUND,
                message="Storage object not found",
            )

        def _generate() -> str:
            client = get_s3_client(public=True)
            return client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": storage_object.bucket,
                    "Key": storage_object.key,
                },
                ExpiresIn=settings.S3_PRESIGNED_URL_EXPIRES,
            )

        try:
            url: str = await asyncio.to_thread(_generate)
            return Result[str](code=ResultCode.OK, message="OK", result=url)
        except Exception as e:
            return Result[str](
                code=ResultCode.GENERAL_ERROR,
                message=f"Error generating presigned URL {e}",
            )

    @staticmethod
    def generate_key(folder: str, filename: str, public_id: str | None = None) -> str:
        """Build a unique object storage key for a file, e.g. 'images/<public_id>.jpg'."""

        object_public_id: str = public_id or create_id(32)
        _name, ext = os.path.splitext(filename)
        return f"{folder.rstrip('/')}/{object_public_id}{ext.lower()}"
