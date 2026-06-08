from typing import List

from pydantic import BaseModel

from backend.core.responses.bookmarkResponse import BookmarkResponse


class BookmarkListResponse(BaseModel):
    bookmarks: List[BookmarkResponse]
