import sys
import asyncio
import os
import shutil

from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.constants import IMAGES_PATH
from backend.core.access.db import rockit_db

from backend.core.access.enumAccess import EnumAccess
from backend.core.access.imageAccess import ImageAccess

from backend.core.access.db.ormEnums.playlistContributorRoleEnum import (
    PlaylistContributorRoleEnumRow,
)
from backend.core.access.db.ormEnums.downloadStatusEnum import DownloadStatusEnumRow
from backend.core.access.db.ormEnums.skipDirectionEnum import SkipDirectionEnumRow
from backend.core.access.db.ormEnums.repeatModeEnum import RepeatModeEnumRow
from backend.core.access.db.ormEnums.queueTypeEnum import QueueTypeEnumRow
from backend.core.access.db.ormEnums.mediaTypeEnum import MediaTypeEnumRow

from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum
from backend.core.enums.skipDirectionEnum import SkipDirectionEnum
from backend.core.enums.repeatModeEnum import RepeatModeEnum
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.enums.queueTypeEnum import QueueTypeEnum

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
        logger.info(f"Source images directory does not exist: {source_dir}")
        return

    os.makedirs(IMAGES_PATH, exist_ok=True)

    for filename in os.listdir(source_dir):
        source_path = os.path.join(source_dir, filename)
        if os.path.isfile(source_path):
            dest_path = os.path.join(IMAGES_PATH, filename)
            shutil.copy(source_path, dest_path)
            logger.info(f"Copied image: {filename}")

            a_result = await ImageAccess.create_image_async(
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


async def add_initial_content():
    try:
        await rockit_db.async_init()
    except Exception as e:
        logger.critical(f"Error initializing database: {e}")
        sys.exit()

    async with rockit_db.session_scope_async() as session:
        await providers.async_init(session=session)

        await add_default_images(session=session)

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


async def main():
    await add_initial_content()


try:
    loop = asyncio.get_running_loop()
    loop.create_task(main())
except RuntimeError:
    asyncio.run(main())
