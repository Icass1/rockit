import asyncio
import warnings
from io import BytesIO
from uuid import uuid4

from PIL import Image as PillowImage
from PIL import ImageDraw, ImageFilter, ImageOps, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.media.image import Image
from core.framework.storage import Storage
from default.access.playlistAccess import PlaylistAccess
from default.access.playlistImageAccess import PlaylistImageAccess
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)
MAX_PLAYLIST_IMAGE_BYTES = 5 * 1024 * 1024


def decode_artwork(data: bytes) -> PillowImage.Image:
    """Validate and normalize artwork before using or storing it."""
    with warnings.catch_warnings():
        warnings.simplefilter("error", PillowImage.DecompressionBombWarning)
        with PillowImage.open(BytesIO(data)) as source:
            if source.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("Unsupported image format")
            if source.width * source.height > 16_000_000:
                raise ValueError("Image dimensions are too large")
            oriented = ImageOps.exif_transpose(source)
            if oriented is None:
                raise ValueError("Image orientation could not be resolved")
            return ImageOps.fit(
                oriented.convert("RGB"), (1024, 1024), method=PillowImage.Resampling.LANCZOS
            )


def render_cover(artworks: list[bytes], generated: bool) -> bytes:
    """Compose a framed artwork mosaic over a blurred, tinted background."""
    images: list[PillowImage.Image] = []
    for data in artworks:
        try:
            images.append(decode_artwork(data=data))
        except (
            ValueError,
            OSError,
            UnidentifiedImageError,
            PillowImage.DecompressionBombError,
            PillowImage.DecompressionBombWarning,
        ):
            if not generated:
                raise ValueError("Invalid playlist image") from None
            logger.warning("Skipping invalid playlist artwork")
    if not images:
        raise ValueError("No usable artwork in playlist")
    cover = images[0]
    if generated:
        cover = cover.filter(ImageFilter.GaussianBlur(radius=48))
        cover = PillowImage.blend(cover, PillowImage.new("RGB", cover.size, (32, 12, 40)), 0.6)
        grid = 1 if len(images) == 1 else 2 if len(images) <= 4 else 3
        gap, margin = 20, 92
        size = (1024 - margin * 2 - gap * (grid - 1)) // grid
        draw = ImageDraw.Draw(cover)
        draw.ellipse((-360, -410, 740, 690), outline=(205, 104, 158), width=3)
        draw.ellipse((450, 510, 1450, 1510), outline=(205, 104, 158), width=3)
        for index in range(grid * grid):
            tile = ImageOps.fit(images[index % len(images)], (size, size))
            mask = PillowImage.new("L", (size, size))
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, size, size), radius=18, fill=255)
            x = margin + (index % grid) * (size + gap)
            y = margin + (index // grid) * (size + gap)
            cover.paste(tile, (x, y), mask)
    output = BytesIO()
    cover.save(output, format="WEBP", quality=90)
    return output.getvalue()


class PlaylistImage:
    @staticmethod
    async def set_playlist_image_async(
        session: AsyncSession, playlist_public_id: str, user_id: int, data: bytes | None = None
    ) -> Result[bool]:
        """Upload artwork or generate a cover from playlist media; only owners may edit."""
        playlist = await PlaylistAccess.get_playlist_by_public_id_async(
            session=session, public_id=playlist_public_id
        )
        if playlist.is_not_ok():
            logger.error("Cannot load playlist artwork owner: %s", playlist.info())
            return Result(code=playlist.code(), message=playlist.message())
        row = playlist.result()
        if row.owner_id != user_id:
            logger.warning("User %s cannot change playlist %s artwork", user_id, playlist_public_id)
            return Result(code=ResultCode.NOT_FOUND, message="Playlist not found or access denied")
        artworks: list[bytes] = []
        if data is not None:
            if not data or len(data) > MAX_PLAYLIST_IMAGE_BYTES:
                logger.warning("Invalid playlist image upload size")
                return Result(
                    code=ResultCode.BAD_REQUEST, message="Image must be between 1 byte and 5 MB"
                )
            artworks.append(data)
        else:
            images = await PlaylistImageAccess.artwork_async(session=session, playlist_id=row.id)
            if images.is_not_ok():
                logger.error("Cannot read playlist artwork: %s", images.info())
                return Result(code=images.code(), message=images.message())
            for image in images.result():
                if image.storage_object.size_bytes > MAX_PLAYLIST_IMAGE_BYTES:
                    logger.warning("Skipping oversized playlist artwork %s", image.id)
                    continue
                downloaded = await Storage.download_bytes_async(
                    session=session, storage_object=image.storage_object
                )
                if downloaded.is_not_ok():
                    logger.warning("Cannot download playlist artwork: %s", downloaded.info())
                    continue
                if len(downloaded.result()) <= MAX_PLAYLIST_IMAGE_BYTES:
                    artworks.append(downloaded.result())
        try:
            encoded = await asyncio.to_thread(
                render_cover, artworks=artworks, generated=data is None
            )
        except (
            ValueError,
            OSError,
            PillowImage.DecompressionBombError,
            PillowImage.DecompressionBombWarning,
        ):
            logger.warning("No valid image available for playlist %s", playlist_public_id)
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Invalid image or no usable artwork in playlist",
            )
        image = await Image.create_image_from_bytes_async(
            session=session,
            data=encoded,
            filename=f"playlists/{uuid4().hex}.webp",
            content_type="image/webp",
            target_format=None,
        )
        if image.is_not_ok():
            logger.error("Cannot store playlist cover: %s", image.info())
            return Result(code=image.code(), message=image.message())
        return await PlaylistImageAccess.assign_async(
            session=session, playlist_id=row.id, image=image.result()
        )
