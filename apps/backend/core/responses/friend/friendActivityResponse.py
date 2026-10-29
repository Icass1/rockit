from core.baseModel import BaseModel


class FriendActivityItem(BaseModel):
    userPublicId: str
    username: str
    userImageUrl: str | None = None
    mediaPublicId: str
    mediaName: str
    mediaImageUrl: str | None = None
    listenedAt: str


class FriendActivityResponse(BaseModel):
    activities: list[FriendActivityItem]
