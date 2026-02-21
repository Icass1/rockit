from fastapi import Depends, APIRouter, HTTPException
from logging import Logger

from backend.core.aResult import AResult
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.spotify.framework.spotify import Spotify
from backend.utils.logger import getLogger

from backend.spotify.responses.albumResponse import AlbumResponse


logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/spotify",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)]
)


@router.get("/album/{public_id}")
async def get_album_async(public_id: str) -> AlbumResponse:
    a_result_album: AResult[AlbumResponse] = await Spotify.get_album_async(id=public_id)
    if a_result_album.is_not_ok():
        logger.error(f"Error getting album. {a_result_album.info()}")
        raise HTTPException(
            status_code=a_result_album.get_http_code(),
            detail=a_result_album.message())

    return a_result_album.result()
