from datetime import datetime

from pydantic import BaseModel


class SendFriendRequest(BaseModel):
    userPublicId: str
    message: str | None = None


class ActionFriendRequest(BaseModel):
    pass


class ShareMediaRequest(BaseModel):
    recipientPublicId: str
    mediaPublicId: str
    message: str | None = None


class ShareActionRequest(BaseModel):
    pass


class ListenTogetherInviteRequest(BaseModel):
    userPublicId: str


class ListenTogetherJoinRequest(BaseModel):
    sessionPublicId: str


class ListenTogetherLeaveRequest(BaseModel):
    sessionPublicId: str


class ListenTogetherSyncRequest(BaseModel):
    sessionPublicId: str
    mediaPublicId: str | None = None
    currentTimeMs: int | None = None
    isPlaying: bool | None = None
    queueJson: str | None = None


class StreakBattleChallengeRequest(BaseModel):
    userPublicId: str


class FriendStatsRequest(BaseModel):
    range: str = "7d"
