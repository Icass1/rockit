from pydantic import BaseModel, Field


class SendFriendRequest(BaseModel):
    userPublicId: str = Field(min_length=1, max_length=128)
    message: str | None = Field(default=None, max_length=2000)


class ActionFriendRequest(BaseModel):
    pass


class ShareMediaRequest(BaseModel):
    recipientPublicId: str = Field(min_length=1, max_length=128)
    mediaPublicId: str = Field(min_length=1, max_length=128)
    message: str | None = Field(default=None, max_length=2000)


class ShareActionRequest(BaseModel):
    pass


class ListenTogetherInviteRequest(BaseModel):
    userPublicId: str = Field(min_length=1, max_length=128)


class ListenTogetherJoinRequest(BaseModel):
    sessionPublicId: str = Field(min_length=1, max_length=128)


class ListenTogetherLeaveRequest(BaseModel):
    sessionPublicId: str = Field(min_length=1, max_length=128)


class ListenTogetherSyncRequest(BaseModel):
    sessionPublicId: str = Field(min_length=1, max_length=128)
    mediaPublicId: str | None = None
    currentTimeMs: int | None = Field(default=None, ge=0, le=86400000)
    isPlaying: bool | None = None
    queue: list[str] | None = Field(default=None, max_length=500)


class StreakBattleChallengeRequest(BaseModel):
    userPublicId: str = Field(min_length=1, max_length=128)


class FriendStatsRequest(BaseModel):
    range: str = "7d"
