from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession
import os
import aiofiles

from backend.constants import MEDIA_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.youtube.framework.youtube import YouTube
from backend.youtube.responses.channelResponse import YoutubeChannelResponse
from backend.youtube.responses.videoResponse import YoutubeVideoResponse

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/youtube",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Youtube"],
)

public_router = APIRouter(prefix="/youtube", tags=["Youtube", "Public"])


@public_router.get("/video/{youtube_id}/stream")
async def stream_video_async(request: Request, youtube_id: str):
    """Stream video."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[YoutubeVideoResponse] = await YouTube.get_video_async(
        session=session, youtube_id=youtube_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting video. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    video_response: YoutubeVideoResponse = a_result.result()
    if not video_response.path:
        raise HTTPException(status_code=404, detail="Video file not found")

    video_path: str = os.path.join(MEDIA_PATH, video_response.path)
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    file_size: int = os.path.getsize(video_path)
    range_header: str | None = request.headers.get("range")

    if range_header:
        range_start: int = 0
        range_end: int = file_size - 1
        if "bytes=" in range_header:
            parts: list[str] = range_header.split("bytes=")[1].split("-")
            if parts[0]:
                range_start = int(parts[0])
            if parts[1]:
                range_end = int(parts[1])

        content_length: int = range_end - range_start + 1

        async def iter_range(start: int, end: int):
            async with aiofiles.open(video_path, "rb") as f:
                await f.seek(start)
                remaining: int = end - start + 1
                while remaining > 0:
                    chunk_size: int = min(1024 * 1024, remaining)
                    chunk: bytes = await f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iter_range(range_start, range_end),
            status_code=206,
            media_type="video/mp4",
            headers={
                "Content-Range": f"bytes {range_start}-{range_end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            },
        )

    async def iter_file():
        async with aiofiles.open(video_path, "rb") as f:
            while True:
                chunk: bytes = await f.read(1024 * 1024)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(
        iter_file(),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
    )


@router.get("/video/{youtube_id}")
async def get_video_async(request: Request, youtube_id: str) -> YoutubeVideoResponse:
    """TODO"""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[YoutubeVideoResponse] = await YouTube.get_video_async(
        session=session, youtube_id=youtube_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting video. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/chanel/{youtube_id}")
async def get_chanel_async(request: Request, youtube_id: str) -> YoutubeChannelResponse:
    """TODO"""

    a_result = AResultCode(code=AResultCode.NOT_IMPLEMENTED, message="TODO")

    raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())
