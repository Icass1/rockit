from typing import Dict

from fastapi import APIRouter, Request, Response, HTTPException

from backend.utils.logger import getLogger

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.youtubeMusic.framework.youtubeMusic import youtube_music

logger = getLogger(__name__)

router = APIRouter(prefix="/youtube-music", tags=["youtube-music"])


@router.get("/audio/{public_id}")
async def get_audio_async(request: Request, public_id: str) -> Response:
    """Stream audio file with range support for HTML audio element seeking."""
    session = DBSessionMiddleware.get_session(request=request)

    a_result_audio = await youtube_music.get_audio_with_range_async(
        session=session, public_id=public_id, request=request
    )
    if a_result_audio.is_not_ok():
        logger.error(f"Error getting audio. {a_result_audio.info()}")
        raise HTTPException(
            status_code=a_result_audio.get_http_code(),
            detail=a_result_audio.message(),
        )

    content: bytes
    status_code: int
    content_range: str
    content, status_code, content_range = a_result_audio.result()

    headers: Dict[str, str] = {
        "Accept-Ranges": "bytes",
        "Content-Range": content_range,
    }

    return Response(
        content=content,
        media_type="audio/mpeg",
        status_code=status_code,
        headers=headers,
    )
