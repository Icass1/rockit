from datetime import datetime

from pydantic import BaseModel


class UserRequestResponse(BaseModel):
    publicId: str
    mediaPublicId: str | None = None
    requestType: str
    proposedValue: str
    comment: str | None = None
    status: str
    reviewComment: str | None = None
    dateAdded: datetime
    userName: str | None = None
    userImage: str | None = None


class UserRequestListResponse(BaseModel):
    requests: list[UserRequestResponse]


class AdminRequestStatsResponse(BaseModel):
    total: int
    pending: int
    accepted: int
    rejected: int
