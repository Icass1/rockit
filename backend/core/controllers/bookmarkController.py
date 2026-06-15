from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.access.db.ormModels.user import UserRow
from backend.core.framework.bookmark.bookmark import Bookmark
from backend.core.requests.getBookmarksRequest import GetBookmarksRequest
from backend.core.requests.createBookmarkRequest import CreateBookmarkRequest
from backend.core.requests.updateBookmarkRequest import UpdateBookmarkRequest
from backend.core.enums.bookmarkModeEnum import BookmarkModeEnum
from backend.core.responses.bookmarkResponse import BookmarkResponse
from backend.core.responses.bookmarkListResponse import BookmarkListResponse
from backend.core.responses.okResponse import OkResponse

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/bookmark",
    tags=["Core", "Bookmark"],
)


@router.post("/list")
async def get_bookmarks(
    request: Request,
    body: GetBookmarksRequest,
    _=Depends(AuthMiddleware.auth_dependency),
) -> BookmarkListResponse:
    """Get bookmarks for the current user, optionally filtered by media."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Unauthorized bookmark fetch. {a_result_user.info()}")
        raise HTTPException(status_code=401)

    a_result = await Bookmark.get_bookmarks_async(
        session=session,
        user_id=a_result_user.result().id,
        media_public_id=body.mediaPublicId,
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting bookmarks. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return BookmarkListResponse(
        bookmarks=[
            BookmarkResponse(
                publicId=b.public_id,
                mediaPublicId=b.media.public_id,
                timestamp=b.timestamp,
                description=b.description,
                mode=BookmarkModeEnum[b.bookmark_mode_enum.value],
                dateAdded=b.date_added,
                dateUpdated=b.date_updated,
            )
            for b in a_result.result()
        ]
    )


@router.post("")
async def create_bookmark(
    request: Request,
    body: CreateBookmarkRequest,
    _=Depends(AuthMiddleware.auth_dependency),
) -> BookmarkResponse:
    """Create a new bookmark."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Unauthorized bookmark create. {a_result_user.info()}")
        raise HTTPException(status_code=401)

    a_result = await Bookmark.create_bookmark_async(
        session=session,
        user_id=a_result_user.result().id,
        media_public_id=body.mediaPublicId,
        timestamp=body.timestamp,
        mode=body.mode,
        description=body.description,
    )
    if a_result.is_not_ok():
        logger.error(f"Error creating bookmark. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    row = a_result.result()
    return BookmarkResponse(
        publicId=row.public_id,
        mediaPublicId=row.media.public_id,
        timestamp=row.timestamp,
        description=row.description,
        mode=BookmarkModeEnum[row.bookmark_mode_enum.value],
        dateAdded=row.date_added,
        dateUpdated=row.date_updated,
    )


@router.post("/{public_id}")
async def update_bookmark(
    request: Request,
    public_id: str,
    body: UpdateBookmarkRequest,
    _=Depends(AuthMiddleware.auth_dependency),
) -> BookmarkResponse:
    """Update an existing bookmark."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Unauthorized bookmark update. {a_result_user.info()}")
        raise HTTPException(status_code=401)

    a_result = await Bookmark.update_bookmark_async(
        session=session,
        user_id=a_result_user.result().id,
        public_id=public_id,
        timestamp=body.timestamp,
        mode=body.mode,
        description=body.description,
    )
    if a_result.is_not_ok():
        logger.error(f"Error updating bookmark {public_id}. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    row = a_result.result()
    return BookmarkResponse(
        publicId=row.public_id,
        mediaPublicId=row.media.public_id,
        timestamp=row.timestamp,
        description=row.description,
        mode=BookmarkModeEnum[row.bookmark_mode_enum.value],
        dateAdded=row.date_added,
        dateUpdated=row.date_updated,
    )


@router.delete("/{public_id}")
async def delete_bookmark(
    request: Request,
    public_id: str,
    _=Depends(AuthMiddleware.auth_dependency),
) -> OkResponse:
    """Delete a bookmark."""

    session = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Unauthorized bookmark delete. {a_result_user.info()}")
        raise HTTPException(status_code=401)

    a_result = await Bookmark.delete_bookmark_async(
        session=session,
        user_id=a_result_user.result().id,
        public_id=public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error deleting bookmark {public_id}. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()
