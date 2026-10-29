from fastapi import APIRouter, Depends, HTTPException, Query, Request

from core.framework.user.librarySearch import LibrarySearch
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.models.librarySongSearch import LibrarySongSort
from core.responses.librarySongSearchResponse import LibrarySongSearchResponse
from logger import getLogger

logger = getLogger(__name__)
router = APIRouter(
    prefix="/user/library",
    tags=["Core", "Library"],
    dependencies=[Depends(AuthMiddleware.auth_dependency)],
)


@router.get("/songs/search")
async def search_library_songs_async(
    request: Request,
    query: str = Query(min_length=1, max_length=200),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    sort: LibrarySongSort = Query(default="relevance"),
) -> LibrarySongSearchResponse:
    """Search individual songs saved directly or reachable through Library collections."""
    user = AuthMiddleware.get_current_user(request=request)
    if user.is_not_ok():
        logger.error(f"Library search authentication failed: {user.info()}")
        raise HTTPException(status_code=user.get_http_code(), detail=user.message())
    result = await LibrarySearch.songs_async(
        session=DBSessionMiddleware.get_session(request=request),
        user_id=user.result().id,
        query=query,
        offset=offset,
        limit=limit,
        sort=sort,
    )
    if result.is_not_ok():
        logger.error(f"Library search request failed: {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()
