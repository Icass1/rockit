from fastapi import Depends, APIRouter, HTTPException
from logging import Logger

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.youtube.framework.youtube import YouTube
from backend.youtube.responses.videoResponse import VideoResponse


logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/youtube",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)


@router.get("/video/{youtube_id}")
async def get_video_async(youtube_id: str) -> VideoResponse:
    a_result: AResult[VideoResponse] = await YouTube.get_video_async(youtube_id=youtube_id)
    if a_result.is_not_ok():
        logger.error(f"Error getting video. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()
