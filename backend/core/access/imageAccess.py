from typing import List, Tuple

from sqlalchemy.sql import Select
from sqlalchemy import Result, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id

from backend.core.utils.safeAsyncCall import safe_async

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.image import ImageRow

logger = getLogger(__name__)


class ImageAccess:
    @staticmethod
    async def get_all_images_async(session: AsyncSession) -> AResult[List[ImageRow]]:
        """Get all images from the database."""

        try:
            stmt: Select[Tuple[ImageRow]] = select(ImageRow)
            result: Result[Tuple[ImageRow]] = await session.execute(stmt)
            rows: List[ImageRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting all images: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting all images"
            )

    @staticmethod
    async def get_image_from_path_async(
        session: AsyncSession,
        path: str,
    ) -> AResult[ImageRow]:
        """Get an ImageRow by path."""

        try:
            stmt: Select[Tuple[ImageRow]] = select(ImageRow).where(
                ImageRow.path == path
            )
            result: Result[Tuple[ImageRow]] = await session.execute(stmt)
            row: ImageRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Image not found")

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting image: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting image"
            )

    @staticmethod
    @safe_async
    async def get_image_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[ImageRow]:
        """Get an ImageRow by its internal ID."""

        stmt: Select[Tuple[ImageRow]] = select(ImageRow).where(ImageRow.id == id)
        result: Result[Tuple[ImageRow]] = await session.execute(stmt)
        row: ImageRow | None = result.scalar_one_or_none()

        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Image not found")

        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    async def insert_image_async(
        session: AsyncSession,
        path: str,
        dominant_color: str,
        url: str | None = None,
    ) -> AResult[ImageRow]:
        """Insert a new ImageRow into the database."""

        try:
            existing_stmt: Select[Tuple[ImageRow]] = select(ImageRow).where(
                ImageRow.path == path
            )
            existing_result: Result[Tuple[ImageRow]] = await session.execute(
                existing_stmt
            )
            existing_row: ImageRow | None = existing_result.scalar_one_or_none()

            if existing_row is not None:
                return AResult(code=AResultCode.OK, message="OK", result=existing_row)

            image: ImageRow = ImageRow(
                public_id=create_id(32),
                path=path,
                url=url,
                dominant_color=dominant_color,
            )
            session.add(image)
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=image)

        except Exception as e:
            logger.error(f"Error inserting image: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error inserting image"
            )

    @staticmethod
    async def get_images_needing_color_backfill_async(
        session: AsyncSession,
    ) -> AResult[List[ImageRow]]:
        """Get all images that have an empty dominant_color."""

        try:
            stmt: Select[Tuple[ImageRow]] = select(ImageRow).where(
                ImageRow.dominant_color == ""
            )
            result: Result[Tuple[ImageRow]] = await session.execute(stmt)
            rows: List[ImageRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting images for color backfill: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting images for color backfill",
            )

    @staticmethod
    async def update_image_dominant_color_async(
        session: AsyncSession,
        image: ImageRow,
        dominant_color: str,
    ) -> AResult[ImageRow]:
        """Update the dominant_color of an image."""

        try:
            image.dominant_color = dominant_color
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=image)

        except Exception as e:
            logger.error(f"Error updating image dominant color: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error updating image dominant color",
            )
