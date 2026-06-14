from typing import List

from pydantic import BaseModel


class UserSearchResult(BaseModel):
    publicId: str
    username: str
    imageUrl: str | None = None
    isFriend: bool = False
    requestSent: bool = False


class FriendSearchResponse(BaseModel):
    results: List[UserSearchResult]
