from typing import Any, List

from fastapi import APIRouter, HTTPException, Query, Request, Depends
from logging import Logger
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.youtube.framework.youtube import YouTube
from backend.youtube.responses.videoResponse import VideoResponse
from backend.youtube.framework.youtubeApi import youtube_api

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/youtube", dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)

public_router = APIRouter(prefix="/youtube")


class YouTubeSearchVideoItem(BaseModel):
    videoId: str
    title: str
    channelTitle: str
    thumbnailUrl: str


class YouTubeSearchResponse(BaseModel):
    videos: List[YouTubeSearchVideoItem]


def _get_thumbnail_url(thumbnails: Any) -> str:
    if not thumbnails:
        return ""
    thumb_dict: dict[str, Any] = thumbnails
    medium = thumb_dict.get("medium", {})
    high = thumb_dict.get("high", {})
    default = thumb_dict.get("default", {})
    return str(medium.get("url") or high.get("url") or default.get("url") or "")


@public_router.get("/search")
async def search_youtube(
    q: str = Query(..., min_length=1), limit: int = Query(default=10, ge=1, le=20)
) -> YouTubeSearchResponse:
    """Search YouTube videos (public endpoint, no auth required)."""

    a_result = await youtube_api.search_videos_async(query=q, max_results=limit)
    if a_result.is_not_ok():
        logger.error(f"YouTube search error: {a_result.info()}")
        return YouTubeSearchResponse(videos=[])

    videos = a_result.result()
    result = [
        YouTubeSearchVideoItem(
            videoId=v.video_id or "",
            title=v.title or "",
            channelTitle=v.channel_title or "",
            thumbnailUrl=_get_thumbnail_url(v.thumbnails),
        )
        for v in videos
    ]

    return YouTubeSearchResponse(videos=result)


@router.get("/video/{youtube_id}")
async def get_video_async(request: Request, youtube_id: str) -> VideoResponse:

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[VideoResponse] = await YouTube.get_video_async(
        session=session, youtube_id=youtube_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting video. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()
