from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.imageAccess import ImageAccess
from backend.core.access.db.ormModels.image import ImageRow

logger: Logger = getLogger(__name__)


class Image:
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
