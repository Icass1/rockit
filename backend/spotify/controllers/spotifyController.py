from fastapi import Depends, APIRouter, HTTPException
from logging import Logger

from backend.core.responses.baseAlbumResponse import BaseAlbumResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseSongResponse import BaseSongResponse
from backend.utils.logger import getLogger

from backend.core.aResult import AResult
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.spotify.framework.spotify import Spotify


logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/spotify",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)


@router.get("/album/{public_id}")
async def get_album_async(public_id: str) -> BaseAlbumResponse:
    a_result_album: AResult[BaseAlbumResponse] = await Spotify.get_album_async(id=public_id)
    if a_result_album.is_not_ok():
        logger.error(f"Error getting album. {a_result_album.info()}")
        raise HTTPException(
            status_code=a_result_album.get_http_code(),
            detail=a_result_album.message())

    return a_result_album.result()


@router.get("/song/{public_id}")
async def get_song_async(public_id: str) -> BaseSongResponse:
    a_result: AResult[BaseSongResponse] = await Spotify.get_track_async(id=public_id)
    if a_result.is_not_ok():
        logger.error(f"Error getting song. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()


@router.get("/artist/{public_id}")
async def get_artist_async(public_id: str) -> BaseArtistResponse:
    a_result: AResult[BaseArtistResponse] = await Spotify.get_artist_async(id=public_id)
    if a_result.is_not_ok():
        logger.error(f"Error getting artist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()


@router.get("/playlist/{public_id}")
async def get_playlist_async(public_id: str) -> BasePlaylistResponse:
    a_result: AResult[BasePlaylistResponse] = await Spotify.get_playlist_async(id=public_id)
    if a_result.is_not_ok():
        logger.error(f"Error getting playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()
