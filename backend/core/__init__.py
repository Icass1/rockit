import sys
import asyncio

from logging import Logger

from backend.utils.logger import getLogger
from backend.core.access.db import rockit_db

from backend.core.access.enumAccess import EnumAccess

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


async def add_initial_content():
    try:
        await rockit_db.async_init()
    except Exception as e:
        logger.critical(f"Error initializing database: {e}")
        sys.exit()

    async with rockit_db.session_scope_async() as session:
        await providers.async_init(session=session)

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
    # Try to get running loop
    loop = asyncio.get_running_loop()
    loop.create_task(add_initial_content())
except RuntimeError:
    # No running loop → create one and run
    asyncio.run(main())
