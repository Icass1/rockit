import os
import shutil

from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.constants import IMAGES_PATH
from backend.core.access.db import rockit_db

from backend.core.access.enumAccess import EnumAccess
from backend.core.access.imageAccess import ImageAccess
from backend.core.framework.media.image import Image

from backend.core.access.db.ormEnums.playlistContributorRoleEnum import (
    PlaylistContributorRoleEnumRow,
)
from backend.core.access.db.ormEnums.downloadStatusEnum import DownloadStatusEnumRow
from backend.core.access.db.ormEnums.skipDirectionEnum import SkipDirectionEnumRow
from backend.core.access.db.ormEnums.repeatModeEnum import RepeatModeEnumRow
from backend.core.access.db.ormEnums.queueTypeEnum import QueueTypeEnumRow
from backend.core.access.db.ormEnums.mediaTypeEnum import MediaTypeEnumRow
from backend.core.access.db.ormEnums.platformEnum import PlatformEnumRow
from backend.core.access.db.ormEnums.bookmarkModeEnum import BookmarkModeEnumRow
from backend.core.access.db.ormEnums.requestTypeEnum import RequestTypeEnumRow
from backend.core.access.db.ormEnums.requestStatusEnum import RequestStatusEnumRow

from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum
from backend.core.enums.skipDirectionEnum import SkipDirectionEnum
from backend.core.enums.repeatModeEnum import RepeatModeEnum
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.enums.platformEnum import PlatformEnum
from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum
from backend.core.enums.requestTypeEnum import RequestTypeEnum
from backend.core.enums.requestStatusEnum import RequestStatusEnum

from backend.core.framework import providers

logger: Logger = getLogger(__name__)


logger.info("")
logger.info("$$$$$$$\\                      $$\\       $$$$$$\\ $$\\")
logger.info("$$  __$$\\                     $$ |      \\_$$  _|$$ |")
logger.info("$$ |  $$ | $$$$$$\\   $$$$$$$\\ $$ |  $$\\   $$ |$$$$$$\\")
logger.info("$$$$$$$  |$$  __$$\\ $$  _____|$$ | $$  |  $$ |\\_$$  _|")
logger.info("$$  __$$< $$ /  $$ |$$ /      $$$$$$  /   $$ |  $$ |")
logger.info("$$ |  $$ |$$ |  $$ |$$ |      $$  _$$<    $$ |  $$ |$$\\")
logger.info("$$ |  $$ |\\$$$$$$  |\\$$$$$$$\\ $$ | \\$$\\ $$$$$$\\ \\$$$$  |")
logger.info("\\__|  \\__| \\______/  \\_______|\\__|  \\__|\\______| \\____/")
logger.info("")


async def add_default_images(session: AsyncSession):
    """Move default images from backend/images to IMAGES_PATH and add to database."""
    source_dir = "backend/images"
    if not os.path.exists(source_dir):
        logger.error(f"Source images directory does not exist: {source_dir}")
        return

    os.makedirs(IMAGES_PATH, exist_ok=True)

    for filename in os.listdir(source_dir):
        source_path = os.path.join(source_dir, filename)
        dest_path = os.path.join(IMAGES_PATH, filename)

        if not os.path.isfile(source_path):
            continue

        if os.path.exists(dest_path):
            logger.info(f"Image already exists at destination: {dest_path}")
        else:
            shutil.copy(source_path, dest_path)
            logger.info(f"Copied image: {filename}")

        a_result_image = await ImageAccess.get_image_from_path_async(
            session=session, path=filename
        )
        if a_result_image.is_ok():
            logger.info(f"Image already in database: {filename}")
            continue

        a_result = await Image.create_image_async(
            session=session,
            path=filename,
            url=None,
        )
        if a_result.is_ok():
            logger.info(f"Added image to database: {filename}")
        else:
            logger.error(
                f"Error adding image to database: {filename} - {a_result.message()}"
            )


async def backfill_dominant_colors(session: AsyncSession):
    """Extract and store dominant_color for all images that are missing it."""

    a_result = await ImageAccess.get_images_needing_color_backfill_async(
        session=session
    )
    if a_result.is_not_ok():
        logger.error(f"Error fetching images for backfill. {a_result.info()}")
        return

    images = a_result.result()

    if not images:
        logger.info("No images need dominant_color backfill")
        return

    logger.info(f"Backfilling dominant_color for {len(images)} images...")

    from backend.utils.colorExtractor import extract_dominant_color

    for index, image in enumerate(images):
        image_path = os.path.join(IMAGES_PATH, image.path)
        color = await extract_dominant_color(image_path)
        if color is not None:
            await ImageAccess.update_image_dominant_color_async(
                session=session, image=image, dominant_color=color
            )
            logger.info(f"Backfilled {image.path} -> {color}")

        if index % 100 == 0:
            await session.commit()

    await session.commit()

    logger.info("Dominant color backfill complete")


async def add_initial_content_async():

    async with rockit_db.session_scope_async() as session:
        await providers.async_init(session=session)

        await add_default_images(session=session)

        await backfill_dominant_colors(session=session)

        await EnumAccess.check_enum_contents_async(
            session=session, enum_class=DownloadStatusEnum, table=DownloadStatusEnumRow
        )
        await EnumAccess.check_enum_contents_async(
            session=session, enum_class=RepeatModeEnum, table=RepeatModeEnumRow
        )
        await EnumAccess.check_enum_contents_async(
            session=session, enum_class=MediaTypeEnum, table=MediaTypeEnumRow
        )
        await EnumAccess.check_enum_contents_async(
            session=session, enum_class=QueueTypeEnum, table=QueueTypeEnumRow
        )
        await EnumAccess.check_enum_contents_async(
            session=session, enum_class=SkipDirectionEnum, table=SkipDirectionEnumRow
        )
        await EnumAccess.check_enum_contents_async(
            session=session,
            enum_class=PlaylistContributorRoleEnum,
            table=PlaylistContributorRoleEnumRow,
        )
        await EnumAccess.check_enum_contents_async(
            session=session,
            enum_class=PlatformEnum,
            table=PlatformEnumRow,
        )
        await EnumAccess.check_enum_contents_async(
            session=session,
            enum_class=BookmarkModeEnum,
            table=BookmarkModeEnumRow,
        )
        await EnumAccess.check_enum_contents_async(
            session=session,
            enum_class=RequestTypeEnum,
            table=RequestTypeEnumRow,
        )
        await EnumAccess.check_enum_contents_async(
            session=session,
            enum_class=RequestStatusEnum,
            table=RequestStatusEnumRow,
        )
