import asyncio
import io
import os
from uuid import uuid4
from PIL import Image as PillowImage, ImageOps, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.aResult import AResult, AResultCode
from backend.core.access.userAccess import UserAccess
from backend.core.framework.media.image import Image
from backend.core.framework.media import image as image_framework
from backend.core.access.db.ormModels.image import ImageRow
from backend.utils.logger import getLogger

logger = getLogger(__name__)
MAX_PROFILE_BYTES = 10 * 1024 * 1024


def _normalize_image(data: bytes, path: str) -> None:
    with PillowImage.open(io.BytesIO(data)) as source:
        if source.width * source.height > 16_000_000:
            raise ValueError("Image dimensions are too large")
        normalized = ImageOps.exif_transpose(source)
        if normalized is None:
            raise ValueError("Could not normalize image")
        image = normalized.convert("RGB")
        image.thumbnail((512, 512))
        image.save(path, format="JPEG", quality=90)


class Profile:
    @staticmethod
    async def upload_image_async(
        session: AsyncSession, user_id: int, data: bytes
    ) -> AResult[ImageRow]:
        """Validate, normalize, store, and link the authenticated user's profile image."""
        if not data or len(data) > MAX_PROFILE_BYTES:
            logger.warning("Invalid profile image size")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid profile image size"
            )
        relative = f"profiles/{uuid4().hex}.jpg"
        path = os.path.join(image_framework.IMAGES_PATH, relative)
        os.makedirs(name=os.path.dirname(path), exist_ok=True)
        try:
            await asyncio.to_thread(_normalize_image, data=data, path=path)
            image = await Image.create_image_async(session=session, path=relative)
            if image.is_not_ok():
                logger.error(image.info())
                return image
            updated = await UserAccess.set_image_async(
                session=session, user_id=user_id, image_id=image.result().id
            )
            if updated.is_not_ok():
                logger.error(updated.info())
                return AResult(code=updated.code(), message=updated.message())
            return image
        except (
            ValueError,
            UnidentifiedImageError,
            OSError,
            PillowImage.DecompressionBombError,
        ):
            logger.warning("Invalid profile image content")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid profile image"
            )
        finally:
            if os.path.exists(path):
                os.unlink(path)
