import asyncio
from io import BytesIO
from uuid import uuid4

from PIL import Image as PillowImage
from PIL import ImageOps, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.userAccess import UserAccess
from core.framework.media.image import Image
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)
MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024


def _encode_profile_image(data: bytes) -> bytes:
    with PillowImage.open(BytesIO(data)) as source:
        if source.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("Use a JPEG, PNG or WebP image")
        if source.width * source.height > 16_000_000:
            raise ValueError("Image dimensions are too large")
        oriented = ImageOps.exif_transpose(source)
        if oriented is None:
            raise ValueError("Image orientation could not be resolved")
        image = ImageOps.fit(
            oriented.convert("RGBA"),
            (512, 512),
            method=PillowImage.Resampling.LANCZOS,
        )
        output = BytesIO()
        image.save(output, format="WEBP", quality=85)
        return output.getvalue()


async def upload_profile_image_async(
    session: AsyncSession, user_id: int, data: bytes
) -> Result[bool]:
    if not data or len(data) > MAX_PROFILE_IMAGE_BYTES:
        return Result(
            code=ResultCode.BAD_REQUEST,
            message="Image must be between 1 byte and 5 MB",
        )
    try:
        encoded = await asyncio.to_thread(_encode_profile_image, data)
    except (
        ValueError,
        UnidentifiedImageError,
        OSError,
        PillowImage.DecompressionBombError,
    ):
        logger.warning("Invalid profile image for user %s", user_id)
        return Result(code=ResultCode.BAD_REQUEST, message="Invalid profile image")

    try:
        image = await Image.create_image_from_bytes_async(
            session=session,
            data=encoded,
            filename=f"avatars/{uuid4().hex}.webp",
            content_type="image/webp",
            target_format=None,
        )
        if image.is_not_ok():
            logger.error("Cannot create profile image: %s", image.info())
            return Result(code=image.code(), message=image.message())
        result = await UserAccess.update_user_image_async(
            session=session, user_id=user_id, image_id=image.result().id
        )
        if result.is_not_ok():
            logger.error("Cannot assign profile image: %s", result.info())
        return result
    except Exception:
        logger.exception("Cannot save profile image for user %s", user_id)
        return Result(code=ResultCode.GENERAL_ERROR, message="Cannot save profile image")
