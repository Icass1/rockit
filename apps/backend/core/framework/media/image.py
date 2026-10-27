import os

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.storageObject import StorageObjectRow
from core.access.imageAccess import ImageAccess
from core.framework.storage import Storage
from core.utils.colorExtractor import extract_dominant_color_from_bytes
from core.utils.imageConverter import convert_image_bytes
from logger import logger
from result import Result, ResultCode


class Image:
    @staticmethod
    async def get_all_images_async(session: AsyncSession) -> Result[list[ImageRow]]:
        """Get all registered images."""

        return await ImageAccess.get_all_images_async(session=session)

    @staticmethod
    async def get_image_from_storage_object_id_async(
        session: AsyncSession, storage_object_id: int
    ) -> Result[ImageRow]:
        """Get the image associated with a storage object."""

        return await ImageAccess.get_image_from_storage_object_id_async(
            session=session, storage_object_id=storage_object_id
        )

    @staticmethod
    async def create_image_from_bytes_async(
        session: AsyncSession,
        data: bytes,
        filename: str,
        content_type: str | None = None,
        target_format: str | None = "webp",
    ) -> Result[ImageRow]:
        """Upload image bytes to object storage and create an ImageRow referencing it.

        ``target_format`` (default ``"webp"``) converts the image before upload;
        pass ``None`` to keep the original bytes unchanged.
        """

        a_result = await Image._create_image_from_bytes_async(
            session=session,
            data=data,
            filename=filename,
            content_type=content_type,
            target_format=target_format,
        )
        if a_result.is_not_ok():
            logger.error(f"Error creating image from bytes ({filename}). {a_result.info()}")

        return a_result

    @staticmethod
    async def ensure_image_from_bytes_async(
        session: AsyncSession,
        key: str,
        data: bytes,
        filename: str,
        content_type: str | None = None,
        target_format: str | None = "webp",
    ) -> Result[ImageRow]:
        """
        Ensure an image exists for the given key, uploading the bytes and registering it if missing.

        ``target_format`` (default ``"webp"``) converts the image before upload;
        pass ``None`` to keep the original bytes unchanged.
        """

        original_key: str | None = None
        if target_format is not None:
            converted = await convert_image_bytes(data=data, target_format=target_format)
            if converted is not None:
                original_key = key
                data = converted.data
                key = f"{os.path.splitext(key)[0]}.{converted.extension}"
                content_type = converted.content_type

        a_result_image: Result[ImageRow] = await Image.get_image_from_key_async(
            session=session, key=key
        )
        if a_result_image.is_ok():
            image_row: ImageRow = a_result_image.result()
            existing_storage_object: StorageObjectRow = image_row.storage_object
            if not await Storage.object_exists_async(
                bucket=existing_storage_object.bucket,
                key=existing_storage_object.key,
            ):
                logger.warning(
                    f"Storage object {existing_storage_object.key} is missing from bucket "
                    f"'{existing_storage_object.bucket}'; re-uploading its bytes."
                )
                if not await Storage.restore_object_async(
                    data=data,
                    key=existing_storage_object.key,
                    content_type=content_type,
                ):
                    logger.error(f"Failed to restore missing image object: {key}")

            if original_key is not None and not existing_storage_object.original_key:
                existing_storage_object.original_key = original_key
                await session.flush()

            logger.info(f"Image already exists: {key}")
            return a_result_image

        a_result_upload: Result[StorageObjectRow] = await Storage.upload_bytes_async(
            session=session,
            data=data,
            key=key,
            content_type=content_type,
            original_key=original_key,
        )
        if a_result_upload.is_not_ok():
            logger.error(f"Error uploading image {filename}: {a_result_upload.info()}")
            return Result(
                code=a_result_upload.code(),
                message=a_result_upload.message(),
            )

        storage_object: StorageObjectRow = a_result_upload.result()
        logger.info(f"Uploaded image to storage: {key}")

        dominant_color: str = ""
        extracted: str | None = await extract_dominant_color_from_bytes(data=data)
        if extracted is not None:
            dominant_color = extracted

        a_result_insert: Result[ImageRow] = await ImageAccess.insert_image_async(
            session=session,
            storage_object_id=storage_object.id,
            dominant_color=dominant_color,
        )
        if a_result_insert.is_not_ok():
            logger.error(f"Error adding image to database: {filename}. {a_result_insert.info()}")

        return a_result_insert

    @staticmethod
    async def create_image_from_storage_object_async(
        session: AsyncSession,
        storage_object: StorageObjectRow,
        dominant_color: str = "",
    ) -> Result[ImageRow]:
        """Create an ImageRow pointing to an existing storage object."""

        return await ImageAccess.insert_image_async(
            session=session,
            storage_object_id=storage_object.id,
            dominant_color=dominant_color,
        )

    @staticmethod
    async def _create_image_from_bytes_async(
        session: AsyncSession,
        data: bytes,
        filename: str,
        content_type: str | None = None,
        target_format: str | None = "webp",
    ) -> Result[ImageRow]:
        """Upload bytes to storage, extract the dominant color, and insert the image row."""

        if target_format is not None:
            converted = await convert_image_bytes(data=data, target_format=target_format)
            if converted is not None:
                data = converted.data
                filename = f"{os.path.splitext(filename)[0]}.{converted.extension}"
                content_type = converted.content_type

        key: str = Storage.generate_key(folder="images", filename=filename)

        a_result_upload: Result[StorageObjectRow] = await Storage.upload_bytes_async(
            session=session,
            data=data,
            key=key,
            content_type=content_type,
        )
        if a_result_upload.is_not_ok():
            return Result(
                code=a_result_upload.code(),
                message=a_result_upload.message(),
            )

        dominant_color: str = ""
        extracted: str | None = await extract_dominant_color_from_bytes(data=data)
        if extracted is not None:
            dominant_color = extracted

        return await ImageAccess.insert_image_async(
            session=session,
            storage_object_id=a_result_upload.result().id,
            dominant_color=dominant_color,
        )

    @staticmethod
    async def get_image_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> Result[ImageRow]:
        """Get an ImageRow by its internal ID."""

        a_result_image: Result[ImageRow] = await ImageAccess.get_image_from_id_async(
            session=session, id=id
        )
        if a_result_image.is_not_ok():
            logger.error(f"Error getting image from id {id}. {a_result_image.info()}")

        return a_result_image

    @staticmethod
    async def get_image_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> Result[ImageRow]:
        """Get an ImageRow by its public ID."""

        a_result_image: Result[ImageRow] = await ImageAccess.get_image_from_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_image.is_not_ok():
            logger.error(f"Error getting image from public id {public_id}. {a_result_image.info()}")

        return a_result_image

    @staticmethod
    async def get_image_from_key_async(
        session: AsyncSession,
        key: str,
    ) -> Result[ImageRow]:
        """Get an ImageRow by the object storage key of its uploaded file."""

        result_object: Result[StorageObjectRow] = await Storage.get_object_from_key_async(
            session=session, key=key
        )
        if result_object.is_not_ok():
            return Result[ImageRow].from_result(result=result_object)

        a_result_image: Result[ImageRow] = await ImageAccess.get_image_from_storage_object_id_async(
            session=session,
            storage_object_id=result_object.result().id,
        )
        if a_result_image.is_not_ok():
            logger.error(
                f"Error getting image from storage object (key {key}). {a_result_image.info()}"
            )

        return a_result_image

    @staticmethod
    async def get_internal_image_urls_by_ids_async(
        session: AsyncSession, image_ids: list[int | None]
    ) -> dict[int, str | None]:
        """Resolve image IDs to short-lived storage URLs through the Image framework."""

        ids = list({image_id for image_id in image_ids if image_id is not None})
        if not ids:
            return {}

        a_result_images = await ImageAccess.get_images_by_ids_async(session=session, ids=ids)
        if a_result_images.is_not_ok():
            logger.error(f"Error getting images by ids. {a_result_images.info()}")
            return {}

        urls: dict[int, str | None] = {}
        for image_id, image in a_result_images.result().items():
            a_result_url = await Image.get_internal_image_url_async(image=image)
            if a_result_url.is_not_ok():
                logger.error(f"Error getting URL for image {image_id}. {a_result_url.info()}")
                urls[image_id] = None
            else:
                urls[image_id] = a_result_url.result()
        return urls

    @staticmethod
    async def get_internal_image_url_async(image: ImageRow) -> Result[str]:
        """Return a short-lived presigned URL of an image."""

        storage_object = image.__dict__.get("storage_object", None)
        if storage_object is None:
            return Result[str](code=ResultCode.NOT_FOUND, message="Storage object not found")
        return await Storage.get_presigned_url_async(storage_object)

    @staticmethod
    async def get_internal_image_url_by_public_id_async(
        session: AsyncSession, public_id: str | None
    ) -> str | None:
        """Resolve an image public ID to its short-lived S3 URL."""

        if not public_id:
            return None
        a_result_image = await Image.get_image_from_public_id_async(
            session=session, public_id=public_id
        )
        if a_result_image.is_not_ok():
            logger.error(f"Error resolving image public id {public_id}. {a_result_image.info()}")
            return None
        a_result_url = await Image.get_internal_image_url_async(image=a_result_image.result())
        if a_result_url.is_not_ok():
            logger.error(f"Error resolving S3 URL for image {public_id}. {a_result_url.info()}")
            return None
        return a_result_url.result()

    @staticmethod
    async def delete_image_async(session: AsyncSession, id: int) -> ResultCode:
        """Delete an image row and its underlying storage object and bytes."""

        a_result_image: Result[ImageRow] = await ImageAccess.get_image_from_id_async(
            session=session, id=id
        )
        if a_result_image.is_not_ok():
            logger.error(f"Error getting image from id {id}. {a_result_image.info()}")
            return ResultCode(code=a_result_image.code(), message=a_result_image.message())

        a_result_delete: ResultCode = await ImageAccess.delete_image_async(session=session, id=id)
        if a_result_delete.is_not_ok():
            logger.error(f"Error deleting image row {id}. {a_result_delete.info()}")
            return a_result_delete

        storage_object: StorageObjectRow | None = a_result_image.result().__dict__.get(
            "storage_object", None
        )
        if storage_object is None:
            return a_result_delete

        return await Storage.delete_object_async(session=session, storage_object=storage_object)
