from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from logger import getLogger
from youtubeMusic.framework.youtubeMusic import YoutubeMusic

logger = getLogger(__name__)
router = APIRouter(prefix="/youtube-music", tags=["Youtube Music"])


@router.get("/audio/{public_id}")
async def get_youtube_music_audio_async(request: Request, public_id: str) -> RedirectResponse:
    """Redirect legacy playback URLs to the registered S3 object without streaming bytes."""
    result = await YoutubeMusic.get_audio_url_async(
        session=DBSessionMiddleware.get_session(request=request), public_id=public_id
    )
    if result.is_not_ok():
        logger.error(f"Cannot resolve legacy audio URL: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return RedirectResponse(
        url=result.result(), status_code=307, headers={"Cache-Control": "no-store"}
    )
