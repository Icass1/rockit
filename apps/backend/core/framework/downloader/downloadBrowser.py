from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.downloadAccess import DownloadAccess
from core.access.downloadBrowseAccess import DownloadBrowseAccess
from core.enums.downloadStatusEnum import DownloadStatusEnum
from core.enums.mediaTypeEnum import MEDIA_TYPE_NAMES
from core.framework import providers
from core.framework.downloader import downloads_manager
from core.framework.downloader.deferredDownload import DeferredDownload
from core.framework.media.image import Image
from core.framework.objectFiles import ObjectFiles
from core.framework.user.user import User
from core.responses.downloadBrowseResponse import (
    DownloadBrowseGroupResponse,
    DownloadBrowseResponse,
    DownloadItemsPageResponse,
    DownloadTotalsResponse,
)
from core.responses.downloadsResponse import DownloadItemResponse
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class DownloadBrowser:
    @staticmethod
    async def item_async(session: AsyncSession, row: dict[str, Any]) -> DownloadItemResponse:
        """Build a lightweight tile directly from local metadata and latest progress."""
        return DownloadItemResponse(
            publicId=row["public_id"],
            mediaPublicId=row["media_public_id"],
            name=row["name"] or row["media_public_id"],
            subtitle=row["provider"],
            status=DownloadStatusEnum(row["status_key"]),
            progress=100 if row["status_key"] == 3 else float(row["progress"] or 0),
            imageUrl=await Image.get_internal_image_url_by_public_id_async(
                session=session, public_id=row["image_public_id"]
            ),
            dateStarted=row["date_started"],
            dateEnded=row["date_ended"],
            contentType=MEDIA_TYPE_NAMES.get(row["media_type_key"], "song"),
            retryCount=row["retry_count"],
        )

    @staticmethod
    async def page_async(
        session: AsyncSession,
        user_id: int,
        page: int,
        status: str,
        kind: str,
        query: str,
    ) -> Result[DownloadBrowseResponse]:
        """Read a bounded page with six preview tiles per group and global counters."""
        result = await DownloadBrowseAccess.groups_async(
            session=session,
            user_id=user_id,
            page=page,
            status=status,
            kind=kind,
            query=query,
        )
        totals = await DownloadBrowseAccess.totals_async(session=session, user_id=user_id)
        if result.is_not_ok() or totals.is_not_ok():
            failure = result if result.is_not_ok() else totals
            logger.error(f"Error browsing downloads: {failure.info()}")
            return Result(code=failure.code(), message=failure.message())
        rows = result.result()
        visible = rows[:12]
        preview = await DownloadBrowseAccess.items_async(
            session=session,
            group_ids=[row["id"] for row in visible],
            status=status,
            limit=6,
            query=query,
        )
        if preview.is_not_ok():
            logger.error(f"Error loading download previews: {preview.info()}")
            return Result(code=preview.code(), message=preview.message())
        items: dict[int, list[DownloadItemResponse]] = {}
        for row in preview.result():
            items.setdefault(row["download_group_id"], []).append(
                await DownloadBrowser.item_async(session=session, row=row)
            )
        groups: list[DownloadBrowseGroupResponse] = []
        for row in visible:
            source_type = MEDIA_TYPE_NAMES.get(row["media_type_key"])
            provider = (
                providers.find_media_provider(provider_id=row["provider_id"])
                if row["provider_id"]
                else None
            )
            external = row["external_id"]
            provider_url = (
                provider.get_collection_provider_url(
                    metadata={"external_id": external},
                    media_type_key=row["media_type_key"],
                )
                if provider and source_type in {"album", "playlist"}
                else ""
            )
            groups.append(
                DownloadBrowseGroupResponse(
                    publicId=row["public_id"],
                    name=row["name"] or row["title"],
                    dateStarted=row["date_started"],
                    dateEnded=row["date_ended"],
                    success=row["completed"],
                    fail=row["failed"],
                    total=row["total"],
                    active=row["active"],
                    matching=row["matching"],
                    sourcePublicId=row["source_public_id"],
                    sourceType=source_type,
                    sourceUrl=(
                        f"/{source_type}/{row['source_public_id']}"
                        if source_type and row["source_public_id"]
                        else ""
                    ),
                    imageUrl=(
                        await Image.get_internal_image_url_by_public_id_async(
                            session=session, public_id=row["image_public_id"]
                        )
                    ),
                    provider=row["provider"] or "",
                    providerUrl=provider_url,
                    inLibrary=row["in_library"],
                    items=items.get(row["id"], []),
                    hasMoreItems=row["matching"] > 6,
                    canManage=row["active"] == 0 and row["manageable"],
                )
            )
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=DownloadBrowseResponse(
                groups=groups,
                totals=DownloadTotalsResponse(**totals.result()),
                page=page,
                hasMore=len(rows) > 12,
            ),
        )

    @staticmethod
    async def items_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
        offset: int,
        status: str,
        query: str = "",
    ) -> Result[DownloadItemsPageResponse]:
        """Authorize a group before loading at most forty-eight additional tracks."""
        group = await DownloadAccess.get_download_group_by_public_id(
            session=session, user_id=user_id, public_id=public_id
        )
        if group.is_not_ok():
            logger.error(f"Error loading group: {group.info()}")
            return Result(code=group.code(), message=group.message())
        if group.result().seen:
            logger.warning("Requested hidden download group")
            return Result(code=ResultCode.NOT_FOUND, message="Download group not found")
        result = await DownloadBrowseAccess.items_async(
            session=session,
            group_ids=[group.result().id],
            status=status,
            offset=offset,
            limit=49,
            query=query,
        )
        if result.is_not_ok():
            logger.error(f"Error loading group items: {result.info()}")
            return Result(code=result.code(), message=result.message())
        rows = result.result()
        count = await DownloadBrowseAccess.item_count_async(
            session=session, group_id=group.result().id, status=status, query=query
        )
        if count.is_not_ok():
            logger.error(f"Error counting group items: {count.info()}")
            return Result(code=count.code(), message=count.message())
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=DownloadItemsPageResponse(
                items=[
                    await DownloadBrowser.item_async(session=session, row=row) for row in rows[:48]
                ],
                offset=offset,
                total=count.result(),
                hasMore=len(rows) > 48,
            ),
        )

    @staticmethod
    async def group_action_async(
        session: AsyncSession, user_id: int, public_id: str, action: str
    ) -> Result[bool]:
        """Apply a complete group action with bounded provider batches and deferred workers."""
        found = await DownloadAccess.get_download_group_by_public_id(
            session=session, user_id=user_id, public_id=public_id, lock=True
        )
        if found.is_not_ok():
            logger.error(f"Error finding action group: {found.info()}")
            return Result(code=found.code(), message=found.message())
        group = found.result()
        result = await DownloadBrowseAccess.group_rows_async(session=session, group_id=group.id)
        if result.is_not_ok():
            logger.error(f"Error reading action targets: {result.info()}")
            return Result(code=result.code(), message=result.message())
        rows = result.result()
        if action == "library":
            if group.seen or not rows:
                logger.warning("Cannot save a hidden or empty download group")
                return Result(code=ResultCode.NOT_FOUND, message="Download group not found")
            public_ids = (
                [group.source_public_id]
                if group.source_public_id
                else list(dict.fromkeys(media.public_id for _, media in rows))
            )
            saved = await User.add_medias_to_library_async(
                session=session, user_id=user_id, public_ids=public_ids
            )
            if saved.is_not_ok():
                logger.error(f"Could not save download group to library: {saved.info()}")
                return Result(code=saved.code(), message=saved.message())
            return Result(code=ResultCode.OK, message="OK", result=True)
        if group.seen or not rows or any(row.status_key not in {3, 4} for row, _ in rows):
            logger.warning("Group is hidden, empty, or still has active downloads")
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Wait for the active downloads to finish",
            )
        for _, media in rows:
            provider = providers.find_media_provider(provider_id=media.provider_id)
            if provider is None or not provider.can_manage_downloads():
                logger.warning("Group contains media that cannot be downloaded again")
                return Result(
                    code=ResultCode.BAD_REQUEST,
                    message="This group contains media that cannot be managed as a download",
                )
        active = await DownloadBrowseAccess.has_other_active_async(
            session=session,
            group_id=group.id,
            media_ids=[media.id for _, media in rows],
        )
        if active.is_not_ok():
            logger.error(f"Error checking concurrent downloads: {active.info()}")
            return Result(code=active.code(), message=active.message())
        if active.result():
            logger.warning("Another group is downloading one of these files")
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="A track is still downloading in another group",
            )
        cleared = await DownloadBrowseAccess.clear_files_async(
            session=session, media_ids=[media.id for _, media in rows]
        )
        if cleared.is_not_ok():
            logger.error(f"Could not clear download paths: {cleared.info()}")
            return Result(code=cleared.code(), message=cleared.message())
        backups: list[str] = []
        try:
            for key in dict.fromkeys(cleared.result()):
                backup = await ObjectFiles.backup_async(key)
                if backup is not None:
                    backups.append(backup)
            if action == "delete":
                saved = await DownloadAccess.mark_download_group_seen(session=session, group=group)
            else:
                saved = await DownloadBrowseAccess.reset_group_async(
                    session=session,
                    group=group,
                    download_ids=[row.id for row, _ in rows],
                )
            if saved.is_not_ok():
                logger.error(f"Could not save group action: {saved.info()}")
                raise RuntimeError(saved.message())
            await session.commit()
        except Exception as error:
            await session.rollback()
            for backup in backups:
                try:
                    await ObjectFiles.delete_async(backup)
                except Exception:
                    logger.exception("Could not discard unneeded S3 backup: %s", backup)
            logger.error(f"Download group action failed: {error}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Could not complete the group action",
            )
        for key in dict.fromkeys(cleared.result()):
            try:
                await ObjectFiles.delete_async(key)
            except Exception:
                logger.exception("Could not remove superseded S3 object: %s", key)
        if action == "retry":
            for row, media in rows:
                task = DeferredDownload(
                    public_id=media.public_id,
                    download_id=row.id,
                    download_group_id=group.id,
                    user_id=user_id,
                )
                task.provider_id = media.provider_id
                downloads_manager.add_download(task)
        return Result(code=ResultCode.OK, message="OK", result=True)
