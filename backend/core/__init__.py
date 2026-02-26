import asyncio
import os

from logging import Logger

from backend.core.access.db.ormEnums.downloadStatusEnum import DownloadStatusEnumRow
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum
from backend.utils.logger import getLogger

from backend.core.access.db.ormEnums.repeatSongEnum import RepeatSongEnumRow
from backend.core.access.enumAccess import EnumAccess
from backend.core.access.db import rockit_db
from backend.core.framework import providers

from backend.core.enums.repeatSongEnum import RepeatSongEnum

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
    await rockit_db.async_init()
    await providers.async_init()

    await EnumAccess.check_enum_contents_async(
        enum_class=DownloadStatusEnum, table=DownloadStatusEnumRow
    )
    await EnumAccess.check_enum_contents_async(RepeatSongEnum, RepeatSongEnumRow)


if not os.environ.get("SKIP_INITIAL_CONTENT"):
    asyncio.create_task(add_initial_content())
