from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.collectionCatalog import collection_catalog
from core.access.db.ormModels.image import ImageRow
from core.utils.safeAsyncCall import safe_async
from default.access.db.ormModels.playlist import PlaylistRow
from default.access.db.ormModels.playlist_media import PlaylistMediaRow
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class PlaylistImageAccess:
    @staticmethod
    @safe_async
    async def artwork_async(session: AsyncSession, playlist_id: int) -> Result[list[ImageRow]]:
        """Read at most nine distinct artwork references through registered providers."""
        metadata = collection_catalog.metadata()
        image_ids = (
            select(metadata.c.image_id, func.min(PlaylistMediaRow.position).label("position"))
            .join(PlaylistMediaRow, PlaylistMediaRow.media_id == metadata.c.id)
            .where(PlaylistMediaRow.playlist_id == playlist_id, metadata.c.image_id.is_not(None))
            .group_by(metadata.c.image_id)
            .order_by(func.min(PlaylistMediaRow.position), metadata.c.image_id)
            .limit(9)
            .subquery()
        )
        images = await session.scalars(
            select(ImageRow)
            .join(image_ids, ImageRow.id == image_ids.c.image_id)
            .order_by(image_ids.c.position, ImageRow.id)
        )
        return Result(code=ResultCode.OK, message="OK", result=list(images.all()))

    @staticmethod
    @safe_async
    async def assign_async(
        session: AsyncSession, playlist_id: int, image: ImageRow
    ) -> Result[bool]:
        """Assign a new image without modifying shared artwork or placeholders."""
        playlist = await session.get(PlaylistRow, playlist_id)
        if playlist is None:
            logger.error("Playlist %s disappeared while assigning artwork", playlist_id)
            return Result(code=ResultCode.NOT_FOUND, message="Playlist not found")
        playlist.image_id = image.id
        playlist.image = image
        await session.flush()
        return Result(code=ResultCode.OK, message="OK", result=True)
