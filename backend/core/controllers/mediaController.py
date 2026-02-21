from typing import List

from logging import Logger

from fastapi import APIRouter, HTTPException

from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.framework import providers
from backend.core.framework.media.media import Media

from backend.core.responses.baseSongResponse import BaseSongResponse
from backend.core.responses.baseAlbumResponse import BaseAlbumResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.searchResponse import ProviderSearchResponse

logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/media")


@router.get("/song/{public_id}")
async def get_song(public_id: str) -> BaseSongResponse:
    """Get a song by its public_id."""

    a_result: AResult[BaseSongResponse] = await Media.get_song_async(
        public_id=public_id, providers=providers)
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()


@router.get("/album/{public_id}")
async def get_album(public_id: str) -> BaseAlbumResponse:
    """Get an album by its public_id."""

    a_result: AResult[BaseAlbumResponse] = await Media.get_album_async(
        public_id=public_id, providers=providers)
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()


@router.get("/artist/{public_id}")
async def get_artist(public_id: str) -> BaseArtistResponse:
    """Get an artist by its public_id."""

    a_result: AResult[BaseArtistResponse] = await Media.get_artist_async(
        public_id=public_id, providers=providers)
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()


@router.get("/playlist/{public_id}")
async def get_playlist(public_id: str) -> BasePlaylistResponse:
    """Get a playlist by its public_id."""

    a_result: AResult[BasePlaylistResponse] = await Media.get_playlist_async(
        public_id=public_id, providers=providers)
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()


@router.get("/search")
async def search(q: str) -> List[ProviderSearchResponse]:
    """Search all providers and return aggregated results."""

    a_result: AResult[List[ProviderSearchResponse]] = await Media.search_async(
        query=q, providers=providers)
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message())

    return a_result.result()
