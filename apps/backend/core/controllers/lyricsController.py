from fastapi import APIRouter, Depends, HTTPException, Request

from core.framework.lyricsCorrections import LyricsContext, LyricsCorrections
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.responses.baseDynamicLyricsResponse import (
    BaseDynamicLyricsItem,
    BaseDynamicLyricsResponse,
)
from core.responses.baseLyricsResponse import BaseLyricsResponse
from core.responses.lyricsCorrectionContextResponse import LyricsCorrectionContextResponse
from logger import getLogger

logger = getLogger(__name__)
router = APIRouter(
    prefix="/lyrics",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Lyrics"],
)


async def _context(request: Request, public_id: str, provider: str | None) -> LyricsContext:
    snapshot = await LyricsCorrections.for_public_id_async(
        session=DBSessionMiddleware.get_session(request=request),
        public_id=public_id,
        provider_name=provider,
    )
    if snapshot.is_not_ok():
        logger.warning("Lyrics unavailable: %s", snapshot.info())
        raise HTTPException(status_code=snapshot.get_http_code(), detail=snapshot.message())
    return snapshot.result()


@router.get("/{public_id}")
async def get_lyrics_async(
    request: Request, public_id: str, provider: str | None = None
) -> BaseLyricsResponse:
    """Return available text, including compatible reviewed overlays."""
    context = await _context(request=request, public_id=public_id, provider=provider)
    if not context.lines:
        raise HTTPException(status_code=404, detail="Lyrics not found")
    return BaseLyricsResponse(
        provider=context.provider,
        publicId=context.public_id,
        lines=[line.text for line in context.lines],
    )


@router.get("/dynamic/{public_id}")
async def get_dynamic_lyrics_async(
    request: Request, public_id: str, provider: str | None = None
) -> BaseDynamicLyricsResponse:
    """Published or reviewed timestamps, without claiming duration proves alignment."""
    context = await _context(request=request, public_id=public_id, provider=provider)
    if not context.lines or any(line.timestamp_s is None for line in context.lines):
        raise HTTPException(status_code=404, detail="Synchronized lyrics not found")
    return BaseDynamicLyricsResponse(
        provider=context.provider,
        publicId=context.public_id,
        offset=context.offset,
        lines=[
            BaseDynamicLyricsItem(text=line.text, timestamp_s=line.timestamp_s)
            for line in context.lines
            if line.timestamp_s is not None
        ],
    )


@router.get("/{public_id}/correction-context")
async def get_lyrics_correction_context_async(
    request: Request, public_id: str, provider: str | None = None
) -> LyricsCorrectionContextResponse:
    """One source-aware read for players and revision-bound correction proposals."""
    context = await _context(request=request, public_id=public_id, provider=provider)
    return LyricsCorrectionContextResponse(
        provider=context.provider,
        publicId=context.public_id,
        revision=context.revision,
        offset=context.offset,
        lines=context.lines,
        syncStatus="approved" if context.approved else "provider",
    )
