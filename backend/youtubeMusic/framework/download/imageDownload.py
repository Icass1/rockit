import uuid
import os
import requests as req
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import IMAGES_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.imageAccess import ImageAccess

logger = getLogger(__name__)


class ImageDownload:
    @staticmethod
    async def download_and_create_internal_image_async(
        session: AsyncSession,
        url: str,
    ) -> AResult[ImageRow]:
        try:
            response = req.get(url, timeout=10)
            if response.status_code != 200:
                return AResult(
                    code=AResultCode.GENERAL_ERROR, message="Image download failed"
                )
            filename = str(uuid.uuid4()) + ".jpg"
            full_path = os.path.join(IMAGES_PATH, "youtubeMusic", filename)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "wb") as f:
                f.write(response.content)

            path = "youtubeMusic/" + filename
            a_result_image = await ImageAccess.create_image_async(
                session=session,
                path=path,
                url=url,
            )
            if a_result_image.is_not_ok():
                logger.error(f"Error creating image: {a_result_image.info()}")
                return AResult(
                    code=a_result_image.code(), message=a_result_image.message()
                )

            image = a_result_image.result()
            logger.debug(
                f"Image created: {image.public_id} from url {url} saved to {path}"
            )
            return AResult(code=AResultCode.OK, message="OK", result=image)
        except Exception as e:
            logger.error(f"Failed to download/create internal image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/Create internal image: {e}",
            )
