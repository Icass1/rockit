from logging import Logger

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from logger import getLogger
from result import Result
from spotify.framework.spotify import Spotify
from spotify.responses.albumResponse import SpotifyAlbumResponse
from spotify.responses.artistResponse import SpotifyArtistResponse
from spotify.responses.songResponse import SpotifyTrackResponse

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/spotify",
    tags=["Spotify"],
)


@router.get("/album/{spotify_id}")
async def get_album_async(request: Request, spotify_id: str) -> SpotifyAlbumResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_album: Result[SpotifyAlbumResponse] = await Spotify.get_album_async(
        session=session, spotify_id=spotify_id
    )
    if a_result_album.is_not_ok():
        logger.error(f"Error getting album. {a_result_album.info()}")
        raise HTTPException(
            status_code=a_result_album.get_http_code(), detail=a_result_album.message()
        )

    return a_result_album.result()


@router.get("/track/{spotify_id}")
async def get_track_async(request: Request, spotify_id: str) -> SpotifyTrackResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[SpotifyTrackResponse] = await Spotify.get_track_async(
        session=session, spotify_id=spotify_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting song. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/artist/{spotify_id}")
async def get_artist_async(request: Request, spotify_id: str) -> BaseArtistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[SpotifyArtistResponse] = await Spotify.get_artist_async(
        session=session, spotify_id=spotify_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting artist. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/playlist/{spotify_id}")
async def get_spotify_playlist_async(
    request: Request, spotify_id: str
) -> BasePlaylistWithMediasResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[BasePlaylistWithMediasResponse] = await Spotify.get_playlist_with_medias_async(
        session=session, spotify_id=spotify_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting playlist. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/audio/{spotify_id}")
async def get_spotify_audio_async(request: Request, spotify_id: str) -> Response:
    """Stream audio file with range support for HTML audio element seeking."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_response: Result[StreamingResponse] = await Spotify.get_audio_with_range_async(
        session=session, spotify_id=spotify_id, request=request
    )
    if a_result_response.is_not_ok():
        logger.error(f"Error getting audio. {a_result_response.info()}")
        raise HTTPException(
            status_code=a_result_response.get_http_code(),
            detail=a_result_response.message(),
        )

    return a_result_response.result()
