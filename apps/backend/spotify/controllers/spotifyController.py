from logging import Logger
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

from backend.spotify.framework.spotify import Spotify

from backend.spotify.responses.songResponse import SpotifyTrackResponse
from backend.spotify.responses.albumResponse import SpotifyAlbumResponse
from backend.spotify.responses.artistResponse import SpotifyArtistResponse

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/spotify",
    tags=["Spotify"],
)


@router.get("/album/{spotify_id}")
async def get_album_async(request: Request, spotify_id: str) -> SpotifyAlbumResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_album: AResult[SpotifyAlbumResponse] = await Spotify.get_album_async(
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
    a_result: AResult[SpotifyTrackResponse] = await Spotify.get_track_async(
        session=session, spotify_id=spotify_id
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
    a_result: AResult[SpotifyArtistResponse] = await Spotify.get_artist_async(
        session=session, spotify_id=spotify_id
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
        await Spotify.get_playlist_with_medias_async(
            session=session, spotify_id=spotify_id
        )
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.api_route("/audio/{spotify_id}", methods=["GET", "HEAD"])
async def get_spotify_audio_async(request: Request, spotify_id: str) -> Response:
    """Stream audio file with range support for HTML audio element seeking."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_response: AResult[Response] = await Spotify.get_audio_with_range_async(
        session=session, spotify_id=spotify_id, request=request
    )
    if a_result_response.is_not_ok():
        logger.error(f"Error getting audio. {a_result_response.info()}")
        raise HTTPException(
            status_code=a_result_response.get_http_code(),
            detail=a_result_response.message(),
        )

    return a_result_response.result()
