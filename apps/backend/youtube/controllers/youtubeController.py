from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response

from core.framework.media.stream import MediaStream
from core.framework.objectFiles import ObjectFiles
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from logger import getLogger
from result import Result, ResultCode
from youtube.framework.youtube import YouTube
from youtube.responses.channelResponse import YoutubeChannelResponse
from youtube.responses.videoResponse import YoutubeVideoResponse

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/youtube",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Youtube"],
)

public_router = APIRouter(prefix="/youtube", tags=["Youtube", "Public"])


@public_router.get("/video/{youtube_id}/stream")
async def stream_video_async(request: Request, youtube_id: str) -> Response:
    """Stream video."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[YoutubeVideoResponse] = await YouTube.get_video_async(
        session=session, youtube_id=youtube_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting video. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    video_response: YoutubeVideoResponse = a_result.result()
    if not video_response.video_path:
        raise HTTPException(status_code=404, detail="Video file not found")

    streamed = await ObjectFiles.stream_async(
        key=video_response.video_path, range_header=request.headers.get("range")
    )
    if streamed.is_not_ok():
        raise HTTPException(status_code=streamed.get_http_code(), detail=streamed.message())
    return streamed.result()


@public_router.get("/video/{youtube_id}/stream/audio")
async def stream_audio_async(request: Request, youtube_id: str) -> Response:
    """Stream audio from video using ffmpeg with seeking support."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[YoutubeVideoResponse] = await YouTube.get_video_async(
        session=session, youtube_id=youtube_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting video. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    video_response: YoutubeVideoResponse = a_result.result()
    if not video_response.video_path:
        raise HTTPException(status_code=404, detail="Video file not found")

    a_result_stream: Result[StreamingResponse] = await MediaStream.stream_audio_object_async(
        key=video_response.video_path, range_header=request.headers.get("range")
    )
    if a_result_stream.is_not_ok():
        logger.error(f"Error streaming audio. {a_result_stream.info()}")
        raise HTTPException(
            status_code=a_result_stream.get_http_code(),
            detail=a_result_stream.message(),
        )

    return a_result_stream.result()


@router.get("/video/{youtube_id}")
async def get_youtube_video_async(request: Request, youtube_id: str) -> YoutubeVideoResponse:
    """TODO"""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[YoutubeVideoResponse] = await YouTube.get_video_async(
        session=session, youtube_id=youtube_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting video. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/chanel/{youtube_id}")
async def get_chanel_async(request: Request, youtube_id: str) -> YoutubeChannelResponse:
    """TODO"""

    a_result = ResultCode(
        code=ResultCode.NOT_IMPLEMENTED, message="get_chanel_async is not implemented."
    )

    raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())
