from typing import cast

from sqlalchemy import Result as DBResult, and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from core.aResult import AResult, AResultCode
from core.enums.mediaTypeEnum import MediaTypeEnum
from logger import getLogger

logger = getLogger(__name__)


class MediaAccess:
    @staticmethod
    async def get_medias_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
        media_type_keys: list[MediaTypeEnum] | None,
    ) -> AResult[list[CoreMediaRow]]:
        """Get CoreMediaRow entries by public_ids and optional media_type."""

        try:
            if media_type_keys is not None:
                where_stmt = and_(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key.in_(
                        media_type_key.value for media_type_key in media_type_keys
                    ),
                )
            else:
                where_stmt = CoreMediaRow.public_id.in_(public_ids)

            stmt: Select[tuple[CoreMediaRow]] = select(CoreMediaRow).where(where_stmt)
            result: DBResult[tuple[CoreMediaRow]] = await session.execute(stmt)
            rows: list[CoreMediaRow] = cast(list[CoreMediaRow], result.scalars().all())

            if not rows:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=(
                        f"Media not found for public ids: {public_ids} with media type "
                        f"key {media_type_keys}"
                    ),
                )

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting media: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting media")

    @staticmethod
    async def get_media_from_public_id_async(
        session: AsyncSession,
        public_id: str,
        media_type_keys: list[MediaTypeEnum] | None,
    ) -> AResult[CoreMediaRow]:
        a_result_media: AResult[
            list[CoreMediaRow]
        ] = await MediaAccess.get_medias_from_public_ids_async(
            session=session, public_ids=[public_id], media_type_keys=media_type_keys
        )

        if a_result_media.is_not_ok():
            logger.error(
                f"Error getting medias from public id {public_id} with media "
                f"type {media_type_keys}."
            )
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        if len(a_result_media.result()) != 1:
            logger.error(
                f"get_medias_from_public_ids_async returned "
                f"{len(a_result_media.result())} rows instead of 1."
            )
            return AResult(
                code=AResultCode.NOT_FOUND,
                message=(
                    f"get_medias_from_public_ids_async returned "
                    f"{len(a_result_media.result())} rows instead of 1."
                ),
            )

        return AResult(code=AResultCode.OK, message="OK", result=a_result_media.result()[0])

    @staticmethod
    async def get_media_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[CoreMediaRow]:
        """Get a CoreMediaRow by id."""

        try:
            stmt: Select[tuple[CoreMediaRow]] = select(CoreMediaRow).where(CoreMediaRow.id == id)
            result: DBResult[tuple[CoreMediaRow]] = await session.execute(stmt)
            row: CoreMediaRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Media not found")

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting media: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting media")

    @staticmethod
    async def get_medias_from_ids_async(
        session: AsyncSession,
        ids: list[int],
    ) -> AResult[list[CoreMediaRow]]:
        """Get CoreMediaRow entries by internal IDs."""

        try:
            stmt: Select[tuple[CoreMediaRow]] = select(CoreMediaRow).where(CoreMediaRow.id.in_(ids))
            result: DBResult[tuple[CoreMediaRow]] = await session.execute(stmt)
            rows: list[CoreMediaRow] = cast(list[CoreMediaRow], result.scalars().all())

            if not rows:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"Media not found for ids: {ids}",
                )

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting media by ids: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting media")

    @staticmethod
    async def get_image_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[ImageRow]:
        """Get an ImageRow by public_id."""

        try:
            stmt: Select[tuple[ImageRow]] = select(ImageRow).where(ImageRow.public_id == public_id)
            result: DBResult[tuple[ImageRow]] = await session.execute(stmt)
            row: ImageRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Image not found")

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting image: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting image")

    @staticmethod
    async def get_image_from_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[ImageRow]:
        """Get an ImageRow by id."""

        try:
            stmt: Select[tuple[ImageRow]] = select(ImageRow).where(ImageRow.id == id)
            result: DBResult[tuple[ImageRow]] = await session.execute(stmt)
            row: ImageRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Image not found")

            return AResult(code=AResultCode.OK, message="OK", result=row)

        except Exception as e:
            logger.error(f"Error getting image: {e}")
            return AResult(code=AResultCode.GENERAL_ERROR, message="Error getting image")
