"""Convert image bytes between formats using PIL.

Best-effort: if the bytes cannot be decoded/encoded, the caller falls back to
uploading the original bytes unchanged.
"""

import asyncio
from io import BytesIO
from typing import NamedTuple

from logger import logger

_EXTENSIONS: dict[str, str] = {
    "jpeg": "jpg",
    "jpg": "jpg",
    "png": "png",
    "webp": "webp",
}

CONTENT_TYPES: dict[str, str] = {
    "jpg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}

_PIL_FORMATS: dict[str, str] = {
    "jpg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
}

SUPPORTED_FORMATS: tuple[str, ...] = ("webp", "jpeg", "jpg", "png")


class ConvertedImage(NamedTuple):
    """Result of converting image bytes to a target format."""

    data: bytes
    extension: str
    content_type: str


def normalize_format(target_format: str) -> str | None:
    """Normalize a target format string to a canonical extension, or None if unsupported."""

    fmt: str = target_format.strip().lower().lstrip(".")
    return _EXTENSIONS.get(fmt)


def content_type_for_format(target_format: str) -> str | None:
    """Return the MIME content type for a target format, or None if unsupported."""

    ext: str | None = normalize_format(target_format)
    if ext is None:
        return None
    return CONTENT_TYPES.get(ext)


def _is_same_format(source_format: str, target_format: str) -> bool:
    if source_format == target_format:
        return True
    return source_format in ("jpeg", "jpg") and target_format in ("jpeg", "jpg")


def _convert_image_bytes_sync(data: bytes, target_format: str) -> ConvertedImage | None:
    """Convert image bytes to the target format.

    Returns a ``ConvertedImage``, or None when conversion is not needed
    (already in the target format) or not possible (invalid data).
    """

    try:
        from PIL import Image
    except Exception as e:
        logger.error(f"PIL is not available for image conversion: {e}")
        return None

    try:
        img = Image.open(BytesIO(data))
    except Exception:
        return None

    source_format: str = (getattr(img, "format", "") or "").lower()
    ext: str | None = normalize_format(target_format)
    if ext is None:
        return None
    if _is_same_format(source_format=source_format, target_format=ext):
        return None

    try:
        if ext == "jpg":
            if img.mode in ("RGBA", "LA"):
                rgba = img.convert("RGBA")
                background = Image.new("RGB", rgba.size, (255, 255, 255))
                background.paste(rgba, mask=rgba.split()[-1])
                img = background
            else:
                img = img.convert("RGB")
        elif img.mode not in ("RGB", "RGBA", "L", "P"):
            img = img.convert("RGBA")

        out = BytesIO()
        img.save(out, format=_PIL_FORMATS[ext])
        return ConvertedImage(
            data=out.getvalue(),
            extension=ext,
            content_type=CONTENT_TYPES[ext],
        )
    except Exception as e:
        logger.error(f"Error converting image to {target_format}: {e}")
        return None


async def convert_image_bytes(data: bytes, target_format: str) -> ConvertedImage | None:
    """Asynchronously convert image bytes to the target format.

    Returns a ``ConvertedImage``, or None when conversion is not needed or
    the input is not a decodable image.
    """

    try:
        return await asyncio.to_thread(_convert_image_bytes_sync, data, target_format)
    except Exception as e:
        logger.error(f"Error converting image to {target_format}: {e}")
        return None
