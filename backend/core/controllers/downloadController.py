from logging import Logger
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio.session import AsyncSession

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.framework.downloader.downloader import Downloader

from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.responses.startDownloadResponse import StartDownloadResponse
from backend.core.requests.startDownloadRequest import StartDownloadRequest

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.download import DownloadRow
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/downloader",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Download"],
)


class DownloadItemResponse(BaseModel):
    publicId: str
    name: str
    completed: float
    message: str


class DownloadGroupResponse(BaseModel):
    publicId: str
    title: str
    dateStarted: str
    success: int
    fail: int
    items: List[DownloadItemResponse]


class DownloadsResponse(BaseModel):
    downloads: List[DownloadGroupResponse]


@router.post("/start-downloads")
async def start_download(
    request: Request, payload: StartDownloadRequest
) -> StartDownloadResponse:
    """Start downloading a list of songs grouped under a single download group."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    a_result: AResult[StartDownloadResponse] = (
        await Downloader.download_multiple_songs_async(
            session=session,
            user_id=user.id,
            title=payload.title,
            public_ids=payload.ids,
        )
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/downloads")
async def get_downloads(request: Request) -> DownloadsResponse:
    """Get all downloads for the current user."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    from sqlalchemy import select

    result = await session.execute(
        select(DownloadGroupRow)
        .where(DownloadGroupRow.user_id == user.id)
        .order_by(DownloadGroupRow.date_started.desc())
    )
    groups: List[DownloadGroupRow] = list(result.scalars().all())

    result_groups: List[DownloadGroupResponse] = []

    for group in groups:
        result_downloads = await session.execute(
            select(DownloadRow).where(DownloadRow.download_group_id == group.id)
        )
        downloads: List[DownloadRow] = list(result_downloads.scalars().all())

        items: List[DownloadItemResponse] = []
        for download in downloads:
            a_result_media = await MediaAccess.get_media_from_id_async(
                session=session, id=download.media_id
            )
            if a_result_media.is_ok():
                media: CoreMediaRow = a_result_media.result()
                status_message = "pending"
                if download.status_key:
                    try:
                        status_enum = DownloadStatusEnum(download.status_key)
                        status_message = status_enum.name.lower().replace("_", " ")
                    except ValueError:
                        status_message = str(download.status_key)
                items.append(
                    DownloadItemResponse(
                        publicId=media.public_id,
                        name=media.public_id,
                        completed=float(download.completed) if download.completed else 0.0,
                        message=status_message,
                    )
                )

        result_groups.append(
            DownloadGroupResponse(
                publicId=group.public_id,
                title=group.title,
                dateStarted=group.date_started.isoformat() if group.date_started else "",
                success=group.success or 0,
                fail=group.fail or 0,
                items=items,
            )
        )

    return DownloadsResponse(downloads=result_groups)


@router.post("/downloads/{public_id}/seen")
async def mark_download_seen(request: Request, public_id: str):
    """Mark a download as seen (delete the download group)."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    from sqlalchemy import select, delete

    result = await session.execute(
        select(DownloadGroupRow).where(
            DownloadGroupRow.public_id == public_id,
            DownloadGroupRow.user_id == user.id,
        )
    )
    group: DownloadGroupRow | None = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=404, detail="Download group not found")

    await session.execute(
        delete(DownloadRow).where(DownloadRow.download_group_id == group.id)
    )
    await session.delete(group)

    return {"ok": True}
