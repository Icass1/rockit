from pydantic import BaseModel

from core.responses.bookmarkResponse import BookmarkResponse


class BookmarkListResponse(BaseModel):
    bookmarks: list[BookmarkResponse]
