from backend.core.framework.storage import Storage
from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.framework.media.stream import MediaStream
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


@public_router.api_route("/video/{youtube_id}/stream", methods=["GET", "HEAD"])
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
    streamed = await Storage.stream_uri_async(
        uri=video_response.video_path,
        range_header=request.headers.get("range"),
        head_only=request.method == "HEAD",
    )
    if streamed.is_not_ok():
        logger.error(streamed.info())
        raise HTTPException(
            status_code=streamed.get_http_code(), detail=streamed.message()
        )
    return streamed.result()


@public_router.api_route("/video/{youtube_id}/stream/audio", methods=["GET", "HEAD"])
async def stream_audio_async(request: Request, youtube_id: str):
    """Stream audio from video using ffmpeg with seeking support."""

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
    if not video_response.video_path:
        raise HTTPException(status_code=404, detail="Video file not found")

    video_path: str = video_response.video_path

    a_result_stream: AResult[StreamingResponse] = (
        await MediaStream.stream_audio_from_video_async(
            video_path=video_path, range_header=request.headers.get("range")
        )
    )
    if a_result_stream.is_not_ok():
        logger.error(f"Error streaming audio. {a_result_stream.info()}")
        raise HTTPException(
            status_code=a_result_stream.get_http_code(),
            detail=a_result_stream.message(),
        )

    return a_result_stream.result()


@router.get("/video/{youtube_id}")
async def get_youtube_video_async(
    request: Request, youtube_id: str
) -> YoutubeVideoResponse:
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

    a_result = AResultCode(
        code=AResultCode.NOT_IMPLEMENTED, message="get_chanel_async is not implemented."
    )

    raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())
