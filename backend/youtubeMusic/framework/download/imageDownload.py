import uuid
import os
import requests as req
from typing import cast, List
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import IMAGES_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.imageAccess import ImageAccess

logger = getLogger(__name__)

THRESHOLD = 20


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

            temp_filename = str(uuid.uuid4()) + ".jpg"
            temp_path = os.path.join(IMAGES_PATH, "youtubeMusic", temp_filename)
            os.makedirs(os.path.dirname(temp_path), exist_ok=True)
            with open(temp_path, "wb") as f:
                f.write(response.content)

            image = Image.open(temp_path)

            real_left_margin_width = int((image.size[0] - image.size[1]) / 2)
            lookup_left_margin_width = int((image.size[0] - image.size[1]) / 2) - 10

            if lookup_left_margin_width > 0:
                reds: List[int] = []
                greens: List[int] = []
                blues: List[int] = []

                for x in range(lookup_left_margin_width):
                    for y in range(image.size[1]):
                        pixel = image.getpixel((x, y))

                        if type(pixel) != tuple:
                            continue

                        pixel = cast(tuple[int, int, int], pixel)

                        if pixel[0] not in reds:
                            reds.append(pixel[0])
                        if pixel[1] not in greens:
                            greens.append(pixel[1])
                        if pixel[2] not in blues:
                            blues.append(pixel[2])

                if (
                    len(reds) < THRESHOLD
                    and len(greens) < THRESHOLD
                    and len(blues) < THRESHOLD
                ):
                    logger.debug("Border detected, cropping image")
                    cropped_image = image.crop(
                        (
                            real_left_margin_width,
                            0,
                            image.size[0] - real_left_margin_width,
                            image.size[1],
                        )
                    )
                    image.close()
                    image = cropped_image

                else:
                    logger.debug(
                        f"No border detected, keeping original image. {len(reds)} unique reds, {len(greens)} unique greens, {len(blues)} unique blues"
                    )

            os.remove(temp_path)

            filename = str(uuid.uuid4()) + ".png"
            full_path = os.path.join(IMAGES_PATH, "youtubeMusic", filename)
            image.save(full_path, format="PNG")
            image.close()

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

            db_image = a_result_image.result()
            logger.debug(
                f"Image created: {db_image.public_id} from url {url} saved to {path}"
            )
            return AResult(code=AResultCode.OK, message="OK", result=db_image)
        except Exception as e:
            logger.error(f"Failed to download/create internal image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/Create internal image: {e}",
            )
