from logging import Logger
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.access.mediaAccess import MediaAccess
from backend.core.framework import providers
from backend.core.framework.provider.baseLyricsProvider import BaseLyricsProvider
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.responses.baseDynamicLyricsResponse import (
    BaseDynamicLyricsItem,
    BaseDynamicLyricsResponse,
)
from backend.core.responses.baseLyricsResponse import BaseLyricsResponse

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/lyrics",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Lyrics"],
)


@router.get("/{public_id}")
async def get_lyrics_async(
    request: Request,
    public_id: str,
    provider: str | None = None,
) -> BaseLyricsResponse:
    """Get lyrics for a media item by its public ID.

    If a provider name is given, use that specific provider.
    Otherwise, try all available lyrics providers in order.
    """

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(status_code=500, detail="Internal server error")

    a_result_media = await MediaAccess.get_media_from_public_id_async(
        session=session, public_id=public_id, media_type_keys=None
    )
    if a_result_media.is_not_ok():
        raise HTTPException(
            status_code=a_result_media.get_http_code(),
            detail=a_result_media.message(),
        )

    media_id: int = a_result_media.result().id
    lyrics_providers: List[BaseLyricsProvider] = providers.get_lyrics_providers()

    if not lyrics_providers:
        raise HTTPException(status_code=501, detail="No lyrics providers available")

    if provider is not None:
        matched: BaseLyricsProvider | None = providers.match_lyrics_provider(
            provider_name=provider
        )
        if matched is None:
            raise HTTPException(
                status_code=404,
                detail=f"Lyrics provider '{provider}' not found",
            )
        lyrics_providers = [matched]

    for lyrics_provider in lyrics_providers:
        a_result = await lyrics_provider.get_lyrics_async(
            session=session, media_ids=[media_id]
        )
        if a_result.is_ok():
            result_map = a_result.result()
            if media_id in result_map:
                lyrics_data = result_map[media_id]
                return BaseLyricsResponse(
                    provider=lyrics_provider.get_name(),
                    publicId=lyrics_data.public_id,
                    lines=[l.text for l in lyrics_data.lines],
                )

    raise HTTPException(
        status_code=404,
        detail=f"Lyrics for media {public_id} not found",
    )


@router.get("/dynamic/{public_id}")
async def get_dynamic_lyrics_async(
    request: Request,
    public_id: str,
    provider: str | None = None,
) -> BaseDynamicLyricsResponse:
    """Get dynamic (timed) lyrics for a media item by its public ID.

    If a provider name is given, use that specific provider.
    Otherwise, try all available lyrics providers in order.
    """

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error {a_result_user.info()}"
        )

    a_result_media = await MediaAccess.get_media_from_public_id_async(
        session=session, public_id=public_id, media_type_keys=None
    )
    if a_result_media.is_not_ok():
        raise HTTPException(
            status_code=a_result_media.get_http_code(),
            detail=a_result_media.message(),
        )

    media_id: int = a_result_media.result().id
    lyrics_providers: List[BaseLyricsProvider] = providers.get_lyrics_providers()

    if not lyrics_providers:
        raise HTTPException(status_code=501, detail="No lyrics providers available")

    if provider is not None:
        matched: BaseLyricsProvider | None = providers.match_lyrics_provider(
            provider_name=provider
        )
        if matched is None:
            raise HTTPException(
                status_code=404,
                detail=f"Lyrics provider '{provider}' not found",
            )
        lyrics_providers = [matched]

    for lyrics_provider in lyrics_providers:
        a_result = await lyrics_provider.get_dynamic_lyrics_async(
            session=session, media_ids=[media_id]
        )
        if a_result.is_ok():
            result_map = a_result.result()
            if media_id in result_map:
                dynamic_data = result_map[media_id]
                return BaseDynamicLyricsResponse(
                    provider=lyrics_provider.get_name(),
                    publicId=dynamic_data.public_id,
                    offset=dynamic_data.offset,
                    lines=[
                        BaseDynamicLyricsItem(text=l.text, timestamp_s=l.timestamp_s)
                        for l in dynamic_data.lines
                    ],
                )

    raise HTTPException(
        status_code=404,
        detail=f"Lyrics for media {public_id} not found",
    )
