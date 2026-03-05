import os
from logging import Logger
from fastapi.responses import FileResponse
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult
from backend.constants import IMAGES_PATH
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.utils.logger import getLogger
from backend.core.access.db.ormModels.image import ImageRow

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.framework.media.media import Media

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
        session=session, public_id=public_id
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
        session=session, public_id=public_id
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
        session=session, public_id=public_id
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
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/video/{public_id}")
async def get_video_async(request: Request, public_id: str) -> BaseVideoResponse:
    """Get a video by its public_id."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BaseVideoResponse] = await Media.get_video_async(
        session=session, public_id=public_id
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
        session=session, query=q
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
    a_result: AResult[ImageRow] = await Media.get_image_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    image: ImageRow = a_result.result()
    image_path: str = IMAGES_PATH + "/" + image.path

    if not os.path.exists(image_path):
        raise HTTPException(
            status_code=404, detail="Image in database but not in filesystem."
        )

    return FileResponse(path=image_path)
