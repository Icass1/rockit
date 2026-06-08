import os
import io
import cv2
import numpy as np
from PIL import Image
from logging import Logger
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from backend.constants import IMAGES_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.image import ImageRow

from backend.core.framework import providers
from backend.core.framework.user.user import User
from backend.core.framework.media.media import Media
from backend.core.framework.provider.types import AddFromUrlAResult

from backend.core.requests.addFromUrlRequest import AddFromUrlRequest

from backend.core.responses.mediaResponse import MediaResponse
from backend.core.responses.okResponse import OkResponse
from backend.core.responses.urlMatchResponse import UrlMatchResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.searchResponse import SearchResultsResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.addFromUrlResponse import AddFromUrlResponse
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.requests import searchRequest

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/media",
    tags=["Core", "Media"],
)


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
async def get_playlist(
    request: Request,
    public_id: str,
    _=Depends(dependency=AuthMiddleware.auth_dependency),
) -> BasePlaylistWithMediasResponse:
    """Get a playlist by its public_id."""

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BasePlaylistWithMediasResponse] = (
        await Media.get_playlist_with_medias_async(
            session=session, user_id=a_result_user.result().id, public_id=public_id
        )
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


@router.get("/station/{public_id}")
async def get_station_async(request: Request, public_id: str) -> BaseStationResponse:
    """Get a station by its public_id."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BaseStationResponse] = await Media.get_station_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.post("/search")
async def search(
    request: Request, payload: searchRequest.SearchRequest
) -> SearchResultsResponse:
    """Search all providers and return aggregated results."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[SearchResultsResponse] = await Media.search_async(
        session=session, query=payload.query
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/{public_id}")
async def get_media(request: Request, public_id: str) -> MediaResponse:
    """Get a media item by its public_id without specifying the type."""

    logger.debug(f"Media.get_media_async called with public_id: {public_id}")

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[MediaResponse] = await Media.get_media_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/image/{public_id}")
async def get_image(request: Request, public_id: str) -> FileResponse:
    """Get an image by its public_id."""

    logger.debug(f"Getting image with public_id: {public_id}")

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
        logger.error(
            f"Image with public_id {public_id} found in database but not in filesystem at path {image_path}"
        )
        raise HTTPException(
            status_code=404, detail="Image in database but not in filesystem."
        )

    return FileResponse(path=image_path)


@router.get("/image/blur/{public_id}")
async def generate_image_async(request: Request, public_id: str):
    """TODO"""

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

    if not os.path.exists(path=image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        # Load source image
        src: Image.Image = Image.open(image_path).convert("RGB")

        src = src.resize(size=(60, 60))

        # Create 1600x900 black background and composite at (left=500, top=-100)
        bg: Image.Image = Image.new("RGBA", (90, 90), (0, 0, 0, 0))
        bg.paste(
            src,
            (int((bg.size[0] - src.size[0]) / 2), int((bg.size[1] - src.size[1]) / 2)),
        )

        # Convert to numpy array for cv2
        bg_np = np.array(bg)

        # Sharp's .blur(sigma) uses a true Gaussian with the given sigma.
        # Kernel size must be odd; 6*sigma+1 is the standard rule of thumb.
        sigma = 10
        k = int(6 * sigma + 1)
        if k % 2 == 0:
            k += 1
        blurred_np = cv2.GaussianBlur(bg_np, ksize=(k, k), sigmaX=sigma, sigmaY=sigma)

        # Resize to 160x90
        resized_np = cv2.resize(
            blurred_np, dsize=(90, 90), interpolation=cv2.INTER_LANCZOS4
        )

        # Encode to WebP
        final = Image.fromarray(resized_np)
        buf = io.BytesIO()
        final.save(buf, format="WEBP")
        buf.seek(0)

        return Response(
            content=buf.read(),
            media_type="image/webp",
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=2592000, immutable",
            },
        )
    except Exception as e:
        return Response(content=f"Error reading image: {e}", status_code=500)


@router.delete(
    path="/{public_id}",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
)
async def delete_media(request: Request, public_id: str) -> OkResponse:
    """Delete the media file for a media item so it can be downloaded again."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[None] = await Media.delete_media_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        logger.error(
            f"Error deleting media with public_id {public_id}. {a_result.info()}"
        )
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.get("/url/match")
async def match_url(request: Request, url: str) -> UrlMatchResponse:
    """Match a URL to an internal path based on provider patterns."""

    path: str | None = providers.match_url(url)
    return UrlMatchResponse(path=path)


@router.post("/url/add")
async def add_from_url(
    request: Request,
    payload: AddFromUrlRequest,
    _=Depends(dependency=AuthMiddleware.auth_dependency),
) -> AddFromUrlResponse:
    """Add media from a URL to the database and to users library if playlist_public_id
    is not given, else it is added to the playlist."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result: AResult[AddFromUrlAResult] = await providers.add_from_url_async(
        session=session, url=payload.url
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding media from URL '{payload.url}'. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    media: AddFromUrlAResult = a_result.result()

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    if payload.addToPlaylist and payload.playlistPublicId:
        from backend.default.framework.playlist import Playlist

        a_result_add_to_playlist = await Playlist.add_media_to_playlist_async(
            session=session,
            playlist_public_id=payload.playlistPublicId,
            user_id=user.id,
            media_public_id=media.publicId,
        )

        if a_result_add_to_playlist.is_not_ok():
            logger.error("Error adding media to playlist.")

    if payload.addToLibrary:
        a_result_add_to_library = await User.add_media_to_library(
            session=session,
            user_id=user.id,
            media_public_id=media.publicId,
        )

        if a_result_add_to_library.is_not_ok():
            logger.error("Error adding media to library.")

    return AddFromUrlResponse(data=media)
