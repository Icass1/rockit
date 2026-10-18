from datetime import datetime

from pydantic import BaseModel, field_serializer

from backend.core.enums.requestTypeEnum import RequestTypeEnum
from backend.core.enums.requestStatusEnum import RequestStatusEnum


class UserRequestResponse(BaseModel):
    publicId: str
    mediaPublicId: str | None = None
    requestType: RequestTypeEnum
    proposedValue: str
    comment: str | None = None
    status: RequestStatusEnum
    reviewComment: str | None = None
    dateAdded: datetime
    userName: str | None = None
    userImage: str | None = None

    @field_serializer("requestType")
    def serialize_request_type(self, repeat_mode: RequestTypeEnum) -> str:
        return repeat_mode.name

    @field_serializer("status")
    def serialize_status(self, repeat_mode: RequestStatusEnum) -> str:
        return repeat_mode.name


class UserRequestListResponse(BaseModel):
    requests: list[UserRequestResponse]


class AdminRequestStatsResponse(BaseModel):
    total: int
    pending: int
    accepted: int
    rejected: int
