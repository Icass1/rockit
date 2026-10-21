from logging import Logger
from typing import List

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.lrclib.framework.lrclib import Lrclib
from backend.lrclib.requests.lyricsRequest import (
    GetLyricsBatchRequest,
    UpdateTimestampsRequest,
)
from backend.lrclib.responses.lyricsResponse import (
    DynamicLyricsItem,
    GetLyricsBatchResponse,
    GetLyricsResponse,
    LyricsItem,
)

logger: Logger = getLogger(name=__name__)
router = APIRouter(prefix="/lrclib", tags=["LRCLIB"])


@router.get("/lyrics/{public_id}")
async def get_lrclib_lyrics_async(
    request: Request,
    public_id: str,
) -> GetLyricsResponse:
    """Get lyrics for a media item by its public ID."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_media = await MediaAccess.get_media_from_public_id_async(
        session=session, public_id=public_id, media_type_keys=None
    )
    if a_result_media.is_not_ok():
        raise HTTPException(
            status_code=a_result_media.get_http_code(),
            detail=a_result_media.message(),
        )

    media: CoreMediaRow = a_result_media.result()
    if media.media_type_key != MediaTypeEnum.SONG.value:
        return GetLyricsResponse(lyrics=None, dynamicLyrics=None)

    media_id = media.id

    a_result_lyrics = await Lrclib.get_lyrics_by_media_ids_async(
        session=session, media_ids=[media_id]
    )
    if a_result_lyrics.is_not_ok():
        raise HTTPException(
            status_code=a_result_lyrics.get_http_code(),
            detail=a_result_lyrics.message(),
        )

    result_map = a_result_lyrics.result()

    lyrics_data = result_map.get(media_id)
    if lyrics_data is None:
        return GetLyricsResponse(lyrics=None, dynamicLyrics=None)

    _, lyrics, dynamic_data = lyrics_data

    return GetLyricsResponse(
        lyrics=[LyricsItem(text=l.text) for l in lyrics] if lyrics else None,
        dynamicLyrics=(
            [
                DynamicLyricsItem(text=l.text, timestamp_s=l.timestamp_s)
                for l in dynamic_data.lines
            ]
            if dynamic_data
            else None
        ),
    )


@router.post("/lyrics")
async def get_lrclib_lyrics_batch_async(
    request: Request,
    body: GetLyricsBatchRequest,
) -> GetLyricsBatchResponse:
    """Get lyrics for multiple media items by their public IDs."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_medias = await MediaAccess.get_medias_from_public_ids_async(
        session=session, public_ids=body.publicIds, media_type_keys=None
    )
    if a_result_medias.is_not_ok():
        raise HTTPException(
            status_code=a_result_medias.get_http_code(),
            detail=a_result_medias.message(),
        )

    medias: List[CoreMediaRow] = a_result_medias.result()

    song_media_ids = [
        m.id for m in medias if m.media_type_key == MediaTypeEnum.SONG.value
    ]

    a_result_lyrics = await Lrclib.get_lyrics_by_media_ids_async(
        session=session, media_ids=song_media_ids
    )
    if a_result_lyrics.is_not_ok():
        raise HTTPException(
            status_code=a_result_lyrics.get_http_code(),
            detail=a_result_lyrics.message(),
        )

    result_map = a_result_lyrics.result()

    lyrics_map: dict[str, GetLyricsResponse] = {}
    for media in medias:
        if media.media_type_key != MediaTypeEnum.SONG.value:
            lyrics_map[media.public_id] = GetLyricsResponse(
                lyrics=None, dynamicLyrics=None
            )
            continue
        lyrics_data = result_map.get(media.id)
        if lyrics_data is None:
            lyrics_map[media.public_id] = GetLyricsResponse(
                lyrics=None, dynamicLyrics=None
            )
        else:
            _, lyrics, dynamic_data = lyrics_data
            lyrics_map[media.public_id] = GetLyricsResponse(
                lyrics=[LyricsItem(text=l.text) for l in lyrics] if lyrics else None,
                dynamicLyrics=(
                    [
                        DynamicLyricsItem(text=l.text, timestamp_s=l.timestamp_s)
                        for l in dynamic_data.lines
                    ]
                    if dynamic_data
                    else None
                ),
            )

    return GetLyricsBatchResponse(lyrics=lyrics_map)


@router.patch("/lyrics/{public_id}/timestamps")
async def update_lrclib_lyrics_timestamps_async(
    request: Request,
    public_id: str,
    body: UpdateTimestampsRequest,
) -> GetLyricsResponse:
    """Update timestamps of dynamic lyrics lines for a media item."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_media = await MediaAccess.get_media_from_public_id_async(
        session=session, public_id=public_id, media_type_keys=None
    )
    if a_result_media.is_not_ok():
        raise HTTPException(
            status_code=a_result_media.get_http_code(),
            detail=a_result_media.message(),
        )

    media: CoreMediaRow = a_result_media.result()
    if media.media_type_key != MediaTypeEnum.SONG.value:
        raise HTTPException(
            status_code=404,
            detail="Lyrics not available for this media type",
        )

    media_id = media.id

    timestamps = [(t.line, t.timestamp_s) for t in body.timestamps]

    a_result_update = await Lrclib.update_dynamic_lyrics_timestamps_async(
        session=session, media_id=media_id, timestamps=timestamps
    )
    if a_result_update.is_not_ok():
        raise HTTPException(
            status_code=a_result_update.get_http_code(),
            detail=a_result_update.message(),
        )

    a_result_lyrics = await Lrclib.get_lyrics_by_media_ids_async(
        session=session, media_ids=[media_id]
    )
    result_map = a_result_lyrics.result()
    lyrics_data = result_map.get(media_id)
    if lyrics_data is None:
        return GetLyricsResponse(lyrics=None, dynamicLyrics=None)

    _, lyrics, dynamic_data = lyrics_data

    return GetLyricsResponse(
        lyrics=[LyricsItem(text=l.text) for l in lyrics] if lyrics else None,
        dynamicLyrics=(
            [
                DynamicLyricsItem(text=l.text, timestamp_s=l.timestamp_s)
                for l in dynamic_data.lines
            ]
            if dynamic_data
            else None
        ),
    )
