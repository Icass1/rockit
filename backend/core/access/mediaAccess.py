from typing import Tuple

from sqlalchemy.sql import Select
from sqlalchemy import Result, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.image import ImageRow

logger = getLogger(__name__)


class MediaAccess:
    @staticmethod
    async def get_media_from_public_id_async(
        session: AsyncSession,
        public_id: str,
        media_type_key: int,
    ) -> AResult[CoreMediaRow]:
        """Get a CoreMediaRow by public_id and media_type."""

        try:
            stmt: Select[Tuple[CoreMediaRow]] = select(CoreMediaRow).where(
                and_(
                    CoreMediaRow.public_id == public_id,
                    CoreMediaRow.media_type_key == media_type_key,
                )
            )
            result = await session.execute(stmt)
            row: CoreMediaRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Media not found")

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting media: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting media"
            )

    @staticmethod
    async def get_media_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[CoreMediaRow]:
        """Get a CoreMediaRow by id."""

        try:
            stmt: Select[Tuple[CoreMediaRow]] = select(CoreMediaRow).where(
                CoreMediaRow.id == id
            )
            result: Result[Tuple[CoreMediaRow]] = await session.execute(stmt)
            row: CoreMediaRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Media not found")

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting media: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting media"
            )

    @staticmethod
    async def get_image_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[ImageRow]:
        """Get an ImageRow by public_id."""

        try:
            stmt: Select[Tuple[ImageRow]] = select(ImageRow).where(
                ImageRow.public_id == public_id
            )
            result: Result[Tuple[ImageRow]] = await session.execute(stmt)
            row: ImageRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Image not found")

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting image"
            )

    @staticmethod
    async def get_image_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[ImageRow]:
        """Get an ImageRow by id."""

        try:
            stmt: Select[Tuple[ImageRow]] = select(ImageRow).where(ImageRow.id == id)
            result: Result[Tuple[ImageRow]] = await session.execute(stmt)
            row: ImageRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Image not found")

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting image"
            )
