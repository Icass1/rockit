from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

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
