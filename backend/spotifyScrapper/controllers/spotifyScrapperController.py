from logging import Logger
from typing import Dict
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, HTTPException, Request

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)

from backend.spotifyScrapper.framework.spotifyScrapper import SpotifyScrapper

from backend.spotifyScrapper.responses.songResponse import SpotifyScrapperTrackResponse
from backend.spotifyScrapper.responses.albumResponse import (
    SpotifyScrapperAlbumResponse,
)
from backend.spotifyScrapper.responses.artistResponse import (
    SpotifyScrapperArtistResponse,
)

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/spotify_scrapper",
    tags=["Spotify Scrapper"],
)


@router.get("/album/{spotify_id}")
async def get_album_async(
    request: Request, spotify_id: str
) -> SpotifyScrapperAlbumResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_album: AResult[SpotifyScrapperAlbumResponse] = (
        await SpotifyScrapper.get_album_async(session=session, spotify_id=spotify_id)
    )
    if a_result_album.is_not_ok():
        logger.error(f"Error getting album. {a_result_album.info()}")
        raise HTTPException(
            status_code=a_result_album.get_http_code(), detail=a_result_album.message()
        )

    return a_result_album.result()


@router.get("/track/{spotify_id}")
async def get_track_async(
    request: Request, spotify_id: str
) -> SpotifyScrapperTrackResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[SpotifyScrapperTrackResponse] = (
        await SpotifyScrapper.get_track_async(session=session, spotify_id=spotify_id)
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting song. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/artist/{spotify_id}")
async def get_artist_async(request: Request, spotify_id: str) -> BaseArtistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[SpotifyScrapperArtistResponse] = (
        await SpotifyScrapper.get_artist_async(session=session, spotify_id=spotify_id)
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting artist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/playlist/{spotify_id}")
async def get_spotify_playlist_async(
    request: Request, spotify_id: str
) -> BasePlaylistWithMediasResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BasePlaylistWithMediasResponse] = (
        await SpotifyScrapper.get_playlist_with_medias_async(
            session=session, spotify_id=spotify_id
        )
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/audio/{spotify_id}")
async def get_spotify_audio_async(request: Request, spotify_id: str) -> Response:
    """Stream audio file with range support for HTML audio element seeking."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_response: AResult[tuple[bytes, int, str]] = (
        await SpotifyScrapper.get_audio_with_range_async(
            session=session, spotify_id=spotify_id, request=request
        )
    )
    if a_result_response.is_not_ok():
        logger.error(f"Error getting audio. {a_result_response.info()}")
        raise HTTPException(
            status_code=a_result_response.get_http_code(),
            detail=a_result_response.message(),
        )

    content: bytes
    status_code: int
    content_range: str
    content, status_code, content_range = a_result_response.result()

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
