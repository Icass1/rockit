import asyncio
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from PIL import Image as PillowImage, ImageOps, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import IMAGES_PATH
from backend.core.aResult import AResult, AResultCode
from backend.core.access.userAccess import UserAccess
from backend.core.framework.media.image import Image
from backend.utils.logger import getLogger

logger = getLogger(__name__)
MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024


def _encode_profile_image(data: bytes) -> bytes:
    with PillowImage.open(BytesIO(data)) as source:
        if source.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("Use a JPEG, PNG or WebP image")
        if source.width * source.height > 16_000_000:
            raise ValueError("Image dimensions are too large")
        oriented = ImageOps.exif_transpose(source)
        image = ImageOps.fit(
            oriented.convert("RGBA"),
            (512, 512),
            method=PillowImage.Resampling.LANCZOS,
        )
        output = BytesIO()
        image.save(output, format="WEBP", quality=85)
        return output.getvalue()


async def _remove_failed_image(path: Path) -> None:
    try:
        await asyncio.to_thread(path.unlink, missing_ok=True)
    except OSError:
        logger.exception("Cannot remove failed profile image")


async def upload_profile_image_async(
    session: AsyncSession, user_id: int, data: bytes
) -> AResult[bool]:
    if not data or len(data) > MAX_PROFILE_IMAGE_BYTES:
        return AResult(
            code=AResultCode.BAD_REQUEST,
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
        return AResult(code=AResultCode.BAD_REQUEST, message="Invalid profile image")

    relative = f"avatars/{uuid4().hex}.webp"
    destination = Path(IMAGES_PATH) / relative
    try:
        await asyncio.to_thread(destination.parent.mkdir, parents=True, exist_ok=True)
        await asyncio.to_thread(destination.write_bytes, encoded)
        image = await Image.create_image_async(session, relative)
        if image.is_not_ok():
            logger.error("Cannot create profile image: %s", image.info())
            await _remove_failed_image(destination)
            return AResult(code=image.code(), message=image.message())
        result = await UserAccess.update_user_image_async(
            session, user_id, image.result().id
        )
        if result.is_not_ok():
            logger.error("Cannot assign profile image: %s", result.info())
            await _remove_failed_image(destination)
        return result
    except Exception:
        logger.exception("Cannot save profile image for user %s", user_id)
        await _remove_failed_image(destination)
        return AResult(
            code=AResultCode.GENERAL_ERROR, message="Cannot save profile image"
        )
