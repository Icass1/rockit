from sqlalchemy import Result as DBResult
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from core.access.db.ormModels.image import ImageRow
from core.utils.createId import create_id
from core.utils.safeAsyncCall import safe_async
from logger import logger
from result import Result, ResultCode


class ImageAccess:
    @staticmethod
    @safe_async
    async def get_all_images_async(session: AsyncSession) -> Result[list[ImageRow]]:
        """Get all images from the database."""

        try:
            stmt: Select[tuple[ImageRow]] = select(ImageRow)
            result: DBResult[tuple[ImageRow]] = await session.execute(stmt)
            rows: list[ImageRow] = list(result.scalars().all())

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting all images: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error getting all images")

    @staticmethod
    @safe_async
    async def get_image_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> Result[ImageRow]:
        """Get an ImageRow by its internal ID."""

        stmt: Select[tuple[ImageRow]] = select(ImageRow).where(ImageRow.id == id)
        result: DBResult[tuple[ImageRow]] = await session.execute(stmt)
        row: ImageRow | None = result.scalar_one_or_none()

        if row is None:
            return Result(code=ResultCode.NOT_FOUND, message="Image not found")

        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_image_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> Result[ImageRow]:
        """Get an ImageRow by its public ID."""

        stmt: Select[tuple[ImageRow]] = select(ImageRow).where(ImageRow.public_id == public_id)
        result: DBResult[tuple[ImageRow]] = await session.execute(stmt)
        row: ImageRow | None = result.scalar_one_or_none()

        if row is None:
            return Result(code=ResultCode.NOT_FOUND, message="Image not found")

        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_image_from_storage_object_id_async(
        session: AsyncSession,
        storage_object_id: int,
    ) -> Result[ImageRow]:
        """Get an ImageRow by the ID of its storage object."""

        stmt: Select[tuple[ImageRow]] = select(ImageRow).where(
            ImageRow.storage_object_id == storage_object_id
        )
        result: DBResult[tuple[ImageRow]] = await session.execute(stmt)
        row: ImageRow | None = result.scalar_one_or_none()

        if row is None:
            return Result(code=ResultCode.NOT_FOUND, message="Image not found")

        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def insert_image_async(
        session: AsyncSession,
        storage_object_id: int,
        dominant_color: str = "",
    ) -> Result[ImageRow]:
        """Insert a new ImageRow into the database."""

        try:
            existing_stmt: Select[tuple[ImageRow]] = select(ImageRow).where(
                ImageRow.storage_object_id == storage_object_id
            )
            existing_result: DBResult[tuple[ImageRow]] = await session.execute(existing_stmt)
            existing_row: ImageRow | None = existing_result.scalar_one_or_none()

            if existing_row is not None:
                return Result(code=ResultCode.OK, message="OK", result=existing_row)

            image: ImageRow = ImageRow(
                public_id=create_id(32),
                storage_object_id=storage_object_id,
                dominant_color=dominant_color,
            )
            session.add(image)
            await session.flush()

            return Result(code=ResultCode.OK, message="OK", result=image)

        except Exception as e:
            logger.error(f"Error inserting image: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error inserting image")

    @staticmethod
    @safe_async
    async def get_images_needing_color_backfill_async(
        session: AsyncSession,
    ) -> Result[list[ImageRow]]:
        """Get all images that have an empty dominant_color."""

        try:
            stmt: Select[tuple[ImageRow]] = select(ImageRow).where(ImageRow.dominant_color == "")
            result: DBResult[tuple[ImageRow]] = await session.execute(stmt)
            rows: list[ImageRow] = list(result.scalars().all())

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting images for color backfill: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting images for color backfill",
            )

    @staticmethod
    @safe_async
    async def delete_image_async(session: AsyncSession, id: int) -> ResultCode:
        """Delete an ImageRow from the database."""

        try:
            found: ImageRow | None = await session.get(ImageRow, id)
            if found is None:
                return ResultCode(code=ResultCode.NOT_FOUND, message="Image not found")

            await session.delete(found)
            await session.flush()

            return ResultCode(code=ResultCode.OK, message="OK")

        except Exception as e:
            logger.error(f"Error deleting image: {e}", exc_info=True)
            return ResultCode(
                code=ResultCode.GENERAL_ERROR,
                message="Error deleting image",
            )

    @staticmethod
    @safe_async
    async def update_image_dominant_color_async(
        session: AsyncSession,
        image: ImageRow,
        dominant_color: str,
    ) -> Result[ImageRow]:
        """Update the dominant_color of an image."""

        try:
            image.dominant_color = dominant_color
            await session.flush()

            return Result(code=ResultCode.OK, message="OK", result=image)

        except Exception as e:
            logger.error(f"Error updating image dominant color: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error updating image dominant color",
            )
