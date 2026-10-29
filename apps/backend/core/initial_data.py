import os
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormEnums.bookmarkModeEnum import BookmarkModeEnumRow
from core.access.db.ormEnums.downloadStatusEnum import DownloadStatusEnumRow
from core.access.db.ormEnums.friendStatusEnum import FriendStatusEnumRow
from core.access.db.ormEnums.listenTogetherStatusEnum import (
    ListenTogetherStatusEnumRow,
)
from core.access.db.ormEnums.mediaTypeEnum import MediaTypeEnumRow
from core.access.db.ormEnums.platformEnum import PlatformEnumRow
from core.access.db.ormEnums.playlistContributorRoleEnum import (
    PlaylistContributorRoleEnumRow,
)
from core.access.db.ormEnums.queueTypeEnum import QueueTypeEnumRow
from core.access.db.ormEnums.repeatModeEnum import RepeatModeEnumRow
from core.access.db.ormEnums.requestStatusEnum import RequestStatusEnumRow
from core.access.db.ormEnums.requestTypeEnum import RequestTypeEnumRow
from core.access.db.ormEnums.skipDirectionEnum import SkipDirectionEnumRow
from core.access.db.ormModels.image import ImageRow
from core.access.enumAccess import EnumAccess
from core.enums.bookmarkModeEnum import BookmarkModeEnum
from core.enums.downloadStatusEnum import DownloadStatusEnum
from core.enums.friend.friendStatusEnum import FriendStatusEnum
from core.enums.friend.listenTogetherStatusEnum import ListenTogetherStatusEnum
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.enums.platformEnum import PlatformEnum
from core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from core.enums.queueTypeEnum import QueueTypeEnum
from core.enums.repeatModeEnum import RepeatModeEnum
from core.enums.requestStatusEnum import RequestStatusEnum
from core.enums.requestTypeEnum import RequestTypeEnum
from core.enums.skipDirectionEnum import SkipDirectionEnum
from core.framework import providers
from core.framework.media.image import Image
from logger import logger
from result import Result


async def add_default_images(session: AsyncSession) -> None:
    """Upload bundled default images to S3 and register them in the database."""
    source_dir = str(Path(__file__).resolve().parents[1] / "images")
    if not os.path.exists(source_dir):
        logger.error(f"Source images directory does not exist: {source_dir}")
        return

    for filename in os.listdir(source_dir):
        source_path = os.path.join(source_dir, filename)

        if not os.path.isfile(source_path):
            continue

        with open(source_path, "rb") as image_file:
            image_bytes: bytes = image_file.read()

        a_result: Result[ImageRow] = await Image.ensure_image_from_bytes_async(
            session=session,
            key=filename,
            data=image_bytes,
            filename=filename,
        )
        if a_result.is_ok():
            logger.info(f"Added image to database: {filename}")
        else:
            logger.error(f"Error adding image to database: {filename} - {a_result.message()}")


async def add_initial_reference_data_async(session: AsyncSession) -> None:
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

    await EnumAccess.check_enum_contents_async(
        session=session,
        enum_class=FriendStatusEnum,
        table=FriendStatusEnumRow,
    )

    await EnumAccess.check_enum_contents_async(
        session=session,
        enum_class=ListenTogetherStatusEnum,
        table=ListenTogetherStatusEnumRow,
    )
