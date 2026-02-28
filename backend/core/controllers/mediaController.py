from logging import Logger

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import IMAGES_PATH
from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.framework import providers
from backend.core.framework.media.media import Media
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.searchResponse import SearchResultsResponse

logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/media")


@router.get("/song/{public_id}")
async def get_song(request: Request, public_id: str) -> BaseSongWithAlbumResponse:
    """Get a song by its public_id."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BaseSongWithAlbumResponse] = await Media.get_song_async(
        session=session, public_id=public_id, providers=providers
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/album/{public_id}")
async def get_album(request: Request, public_id: str) -> BaseAlbumWithSongsResponse:
    """Get an album by its public_id."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BaseAlbumWithSongsResponse] = await Media.get_album_async(
        session=session, public_id=public_id, providers=providers
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/artist/{public_id}")
async def get_artist(request: Request, public_id: str) -> BaseArtistResponse:
    """Get an artist by its public_id."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BaseArtistResponse] = await Media.get_artist_async(
        session=session, public_id=public_id, providers=providers
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/playlist/{public_id}")
async def get_playlist(request: Request, public_id: str) -> BasePlaylistResponse:
    """Get a playlist by its public_id."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BasePlaylistResponse] = await Media.get_playlist_async(
        session=session, public_id=public_id, providers=providers
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/search")
async def search(request: Request, q: str) -> SearchResultsResponse:
    """Search all providers and return aggregated results."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[SearchResultsResponse] = await Media.search_async(
        session=session, query=q, providers=providers
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/image/{public_id}")
async def get_image(request: Request, public_id: str) -> FileResponse:
    """Get an image by its public_id."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await Media.get_image_async(session=session, public_id=public_id)
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    image = a_result.result()
    image_path = IMAGES_PATH + "/" + image.path

    return FileResponse(path=image_path)
