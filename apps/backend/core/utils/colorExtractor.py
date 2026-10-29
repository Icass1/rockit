"""Extract the dominant vibrant color from an image using PIL.

Algorithm: bucket quantization + saturation-weighted scoring.
Similar to Android Palette / Vibrant.js — prioritizes saturated colors
over the most numerically common (which is usually black or white).
"""

import asyncio
from io import BytesIO
from typing import Any, cast

from logger import logger

_SAMPLE_SIZE = 50
_QUANTIZE_COLORS = 8


def _rgb_to_hsl(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert RGB (0-255) to HSL (0-1)."""

    rn = r / 255.0
    gn = g / 255.0
    bn = b / 255.0

    max_val = max(rn, gn, bn)
    min_val = min(rn, gn, bn)
    lightness: float = (max_val + min_val) / 2.0

    if max_val == min_val:
        return 0.0, 0.0, lightness

    d = max_val - min_val
    s = d / (2.0 - max_val - min_val) if lightness > 0.5 else d / (max_val + min_val)

    if max_val == rn:
        h = ((gn - bn) / d + (6 if gn < bn else 0)) / 6.0
    elif max_val == gn:
        h = ((bn - rn) / d + 2) / 6.0
    else:
        h = ((rn - gn) / d + 4) / 6.0

    return h, s, lightness


async def extract_dominant_color(
    image_path: str,
) -> str | None:  # This should return Result when Result is moved to this directory.
    """Extract the dominant vibrant color from an image file.

    Returns a hex string like "#ee1086" or None on failure.
    """

    try:
        with open(image_path, "rb") as f:
            return await extract_dominant_color_from_bytes(data=f.read())
    except Exception as e:
        logger.error(f"Error reading image from {image_path}: {e}")
        return None


async def extract_dominant_color_from_bytes(data: bytes) -> str | None:
    """Extract the dominant vibrant color from image bytes.

    Returns a hex string like "#ee1086" or None on failure.
    """

    def _extract_sync() -> str | None:
        from PIL import Image

        try:
            img = Image.open(BytesIO(data))
        except Exception:
            return None

        img = img.convert("RGB")
        image: Any = img
        resized = image.resize((_SAMPLE_SIZE, _SAMPLE_SIZE), cast(int, Image.Resampling.LANCZOS))
        img = resized

        quantized = img.quantize(colors=_QUANTIZE_COLORS, method=2)
        palette_raw: list[int] | None = quantized.getpalette()
        if palette_raw is None:
            return None

        palette: list[int] = palette_raw

        color_counts: list[tuple[int, Any]] | None = quantized.getcolors()
        if not color_counts:
            return None

        best_r: int = 0
        best_g: int = 0
        best_b: int = 0
        best_score: float = -1.0
        largest_count: int = 0
        largest_r: int = 0
        largest_g: int = 0
        largest_b: int = 0

        for count, index in color_counts:
            idx: int = int(index)
            r: int = palette[idx * 3]
            g: int = palette[idx * 3 + 1]
            b: int = palette[idx * 3 + 2]

            if count > largest_count:
                largest_count = count
                largest_r, largest_g, largest_b = r, g, b

            _h, s, lightness = _rgb_to_hsl(r, g, b)

            if lightness < 0.08 or lightness > 0.92:
                continue
            if s < 0.15:
                continue

            score = count * (0.3 + s)
            if score > best_score:
                best_score = score
                best_r, best_g, best_b = r, g, b

        if best_score >= 0:
            return f"#{best_r:02x}{best_g:02x}{best_b:02x}"

        return f"#{largest_r:02x}{largest_g:02x}{largest_b:02x}"

    try:
        return await asyncio.to_thread(_extract_sync)
    except Exception as e:
        logger.error(f"Error extracting dominant color: {e}")
        return None
