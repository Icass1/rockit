import asyncio

from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import BACKEND_URL, IMAGES_PATH
from backend.utils.logger import getLogger
from backend.utils.colorExtractor import extract_dominant_color

from backend.core.aResult import AResult, AResultCode

from backend.core.access.imageAccess import ImageAccess
from backend.core.access.db.ormModels.image import ImageRow

logger: Logger = getLogger(__name__)


class Image:
    @staticmethod
    async def create_image_async(
        session: AsyncSession,
        path: str,
        url: str | None = None,
    ) -> AResult[ImageRow]:
        """Create a new image, extracting its dominant color."""

        existing: AResult[ImageRow] = await ImageAccess.get_image_from_path_async(
            session=session, path=path
        )
        if existing.is_ok():
            return existing

        dominant_color: str = ""
        extracted: str | None = await asyncio.to_thread(
            extract_dominant_color, IMAGES_PATH + "/" + path
        )
        if extracted is not None:
            dominant_color = extracted

        return await ImageAccess.insert_image_async(
            session=session, path=path, url=url, dominant_color=dominant_color
        )

    @staticmethod
    async def get_image_from_path_async(
        session: AsyncSession,
        path: str,
    ) -> AResult[ImageRow]:
        """Get an ImageRow from the path."""

        a_result_image: AResult[ImageRow] = await ImageAccess.get_image_from_path_async(
            session=session, path=path
        )
        if a_result_image.is_not_ok():
            logger.error(
                f"Error getting image from path {path}. {a_result_image.info()}"
            )
            return AResult(code=a_result_image.code(), message=a_result_image.message())

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_image.result()
        )

    @staticmethod
    def get_internal_image_url(image: ImageRow | None) -> str:
        """Return the internal image URL for a given image row, or empty string if None."""

        if image is None:
            return ""
        return f"{BACKEND_URL}/media/image/{image.public_id}"
