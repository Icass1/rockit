import io
import os
from logging import Logger

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from constants import IMAGES_PATH
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.user import UserRow
from core.aResult import AResult, AResultCode
from core.framework import providers
from core.framework.media.artist import Artist
from core.framework.media.collection import Collection
from core.framework.media.media import Media
from core.framework.media.search import provider_search
from core.framework.provider.types import AddFromUrlAResult
from core.framework.recommendation import Recommendation, RecommendationResult
from core.framework.user.user import User
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.requests import searchRequest
from core.requests.addFromUrlRequest import AddFromUrlRequest
from core.requests.searchProviderRequest import SearchProviderRequest
from core.responses.addFromUrlResponse import AddFromUrlResponse
from core.responses.artistPageResponse import ArtistPageResponse
from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.responses.mediaResponse import MediaResponse
from core.responses.okResponse import OkResponse
from core.responses.searchProviderResponse import (
    SearchProviderResponse,
    SearchProvidersResponse,
)
from core.responses.searchResponse import SearchResultsResponse
from core.responses.songListResponse import SongListResponse
from core.responses.urlMatchResponse import UrlMatchResponse
from logger import getLogger

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/media",
    tags=["Core", "Media"],
)


from core.responses.audioBoundsResponse import AudioBoundsResponse


@router.get("/song/{public_id}/audio-bounds")
async def get_audio_bounds(
    request: Request,
    public_id: str,
    response: Response,
    _=Depends(dependency=AuthMiddleware.auth_dependency),
) -> AudioBoundsResponse:
    """Cached metadata only; never wait for a decoder or accept file paths."""
    response.headers["Cache-Control"] = "no-store"
    result = await Media.get_audio_bounds_async(
        session=DBSessionMiddleware.get_session(request=request), public_id=public_id
    )
    if result.is_not_ok():
        logger.error(f"Could not get audio boundaries. {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.get("/song/{public_id}")
async def get_song(request: Request, public_id: str) -> BaseSongWithAlbumResponse:
    """Get a song by its public_id."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BaseSongWithAlbumResponse] = await Media.get_song_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/song/{public_id}/related")
async def get_related_songs(
    request: Request,
    public_id: str,
    limit: int = 20,
    external: bool = True,
    _: None = Depends(dependency=AuthMiddleware.auth_dependency),
) -> SongListResponse:
    """Songs similar to this one (local engine), plus optional external
    suggestions for songs not downloaded here yet."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[RecommendationResult] = await Recommendation.get_related_songs_async(
        session=session,
        user_id=a_result_user.result().id,
        public_id=public_id,
        limit=limit,
        include_external=external,
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting related songs for {public_id}. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return Recommendation.to_song_list_response(result=a_result.result())


@router.get("/album/{public_id}")
async def get_album(
    request: Request,
    public_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    query: str = Query(default="", max_length=200),
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> BaseAlbumWithSongsResponse:
    """Get album metadata and one bounded page of songs."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Album authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Collection.page_async(
        session=DBSessionMiddleware.get_session(request=request),
        public_id=public_id,
        user_id=user.result().id,
        offset=offset,
        limit=limit,
        query=query,
    )
    if result.is_not_ok():
        logger.error(f"Album page failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    page = result.result()
    if not isinstance(page.collection, BaseAlbumWithSongsResponse):
        logger.warning("Requested album is not an album")
        raise HTTPException(status_code=404, detail="Album not found")
    return page.collection.model_copy(
        update=dict(
            songs=[entry.item for entry in page.items],
            offset=offset,
            limit=limit,
            total=page.total,
            hasMore=page.hasMore,
        )
    )


@router.get("/artist/{public_id}")
async def get_artist(request: Request, public_id: str) -> BaseArtistResponse:
    """Get an artist by its public_id."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BaseArtistResponse] = await Media.get_artist_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/playlist/{public_id}")
async def get_playlist(
    request: Request,
    public_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    query: str = Query(default="", max_length=200),
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> BasePlaylistWithMediasResponse:
    """Get playlist metadata and one page; nested collections have no contents."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Playlist authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Collection.page_async(
        session=DBSessionMiddleware.get_session(request=request),
        public_id=public_id,
        user_id=user.result().id,
        offset=offset,
        limit=limit,
        query=query,
    )
    if result.is_not_ok():
        logger.error(f"Playlist page failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    page = result.result()
    if not isinstance(page.collection, BasePlaylistWithMediasResponse):
        logger.warning("Requested playlist is not a playlist")
        raise HTTPException(status_code=404, detail="Playlist not found")
    return page.collection.model_copy(
        update=dict(
            medias=page.items,
            offset=offset,
            limit=limit,
            total=page.total,
            hasMore=page.hasMore,
        )
    )


@router.get("/video/{public_id}")
async def get_video_async(request: Request, public_id: str) -> BaseVideoResponse:
    """Get a video by its public_id."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BaseVideoResponse] = await Media.get_video_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/frame/{public_id}")
async def get_frame_async(request: Request, public_id: str, timestamp_ms: float) -> Response:
    """Extract a single frame from a video at the given timestamp (ms)."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[bytes] = await Media.get_frame_async(
        session=session, public_id=public_id, timestamp_ms=timestamp_ms
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return Response(
        content=a_result.result(),
        media_type="image/webp",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=2592000, immutable",
        },
    )


@router.get("/station/{public_id}")
async def get_station_async(request: Request, public_id: str) -> BaseStationResponse:
    """Get a station by its public_id."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[BaseStationResponse] = await Media.get_station_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/search/providers")
async def search_providers_async(
    _: None = Depends(dependency=AuthMiddleware.auth_dependency),
) -> SearchProvidersResponse:
    return provider_search.catalog()


@router.post("/search/provider")
async def search_provider_async(
    payload: SearchProviderRequest,
    _: None = Depends(dependency=AuthMiddleware.auth_dependency),
) -> SearchProviderResponse:
    result = await provider_search.search_async(
        provider_id=payload.providerId,
        query=payload.query,
        limit=payload.limit,
        media_type=payload.mediaType,
    )
    if result.is_not_ok():
        logger.error(f"Provider search error. {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.post("/search")
async def search_async(
    request: Request, payload: searchRequest.SearchRequest
) -> SearchResultsResponse:
    """Search all providers and return aggregated results."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[SearchResultsResponse] = await Media.search_async(
        session=session, query=payload.query
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/{public_id}")
async def get_media_async(
    request: Request,
    public_id: str,
    _: None = Depends(dependency=AuthMiddleware.auth_dependency),
) -> MediaResponse:
    """Get a media item by its public_id without specifying the type."""

    logger.debug(f"Media.get_media_async called with public_id: {public_id}")

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user_id: int = a_result_user.result().id

    a_result: AResult[MediaResponse] = await Media.get_media_async(
        session=session, public_id=public_id, user_id=user_id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return a_result.result()


@router.get("/image/{public_id}")
async def get_media_image_async(request: Request, public_id: str) -> FileResponse:
    """Get an image by its public_id."""

    logger.debug(f"Getting image with public_id: {public_id}")

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[ImageRow] = await Media.get_image_async(session=session, public_id=public_id)
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    image: ImageRow = a_result.result()
    image_path: str = IMAGES_PATH + "/" + image.path

    if not os.path.exists(image_path):
        logger.error(
            f"Image with public_id {public_id} found in database but not in "
            f"filesystem at path {image_path}"
        )
        raise HTTPException(status_code=404, detail="Image in database but not in filesystem.")

    return FileResponse(path=image_path)


@router.get("/image/blur/{public_id}")
async def generate_image_async(request: Request, public_id: str) -> Response:
    """TODO"""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResult[ImageRow] = await Media.get_image_async(session=session, public_id=public_id)
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

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
        resized_np = cv2.resize(blurred_np, dsize=(90, 90), interpolation=cv2.INTER_LANCZOS4)

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
    dependencies=[Depends(dependency=AuthMiddleware.admin_dependency)],
)
async def delete_media_file_async(request: Request, public_id: str) -> OkResponse:
    """Delete the media file for a media item so it can be downloaded again."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: AResultCode = await Media.delete_media_file_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error deleting media with public_id {public_id}. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    logger.info("TODO")

    return OkResponse()


@router.get("/url/match")
async def match_url_async(request: Request, url: str) -> UrlMatchResponse:
    """Match a URL to an internal path based on provider patterns."""

    path: str | None = providers.match_url(url)
    return UrlMatchResponse(path=path)


@router.post("/url/add")
async def add_from_url_async(
    request: Request,
    payload: AddFromUrlRequest,
    _: None = Depends(dependency=AuthMiddleware.auth_dependency),
) -> AddFromUrlResponse:
    """Add media from a URL to the database and to users library if playlist_public_id
    is not given, else it is added to the playlist."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result: AResult[AddFromUrlAResult] = await providers.add_from_url_async(
        session=session, url=payload.url
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding media from URL '{payload.url}'. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    media: AddFromUrlAResult = a_result.result()

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    if payload.addToPlaylist and payload.playlistPublicId:
        a_result_add_to_playlist = await providers.add_media_to_playlist_async(
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


@router.get("/artist/{public_id}/page")
async def get_artist_catalog_page(
    request: Request,
    public_id: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> ArtistPageResponse:
    """Read the local artist catalog across registered providers."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Artist authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Artist.page_async(
        session=DBSessionMiddleware.get_session(request=request),
        user_id=user.result().id,
        public_id=public_id,
        offset=offset,
        limit=limit,
    )
    if result.is_not_ok():
        logger.error(f"Artist page failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.get("/artists/profile")
async def get_artist_page_by_name(
    request: Request,
    name: str = Query(min_length=1, max_length=200),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> ArtistPageResponse:
    """Resolve an uploaded artist without inventing a Core media identifier."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Artist authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await Artist.page_async(
        session=DBSessionMiddleware.get_session(request=request),
        user_id=user.result().id,
        name=name,
        offset=offset,
        limit=limit,
    )
    if result.is_not_ok():
        logger.error(f"Artist page failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()
