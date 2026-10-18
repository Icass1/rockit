from pydantic import BaseModel, field_validator

from backend.core.enums.requestTypeEnum import RequestTypeEnum
from backend.core.enums.requestStatusEnum import RequestStatusEnum


class CreateUserRequestRequest(BaseModel):
    mediaPublicId: str
    requestType: RequestTypeEnum
    proposedValue: str
    comment: str | None = None

    @field_validator("requestType", mode="before")
    @classmethod
    def parse_request_type(cls, v: object) -> RequestTypeEnum:
        if isinstance(v, RequestTypeEnum):
            return v
        if isinstance(v, str):
            return RequestTypeEnum[v.upper()]
        raise ValueError(f"Invalid request type: {v}")


class GetAllRequestsRequest(BaseModel):
    status: RequestStatusEnum | None = None
    limit: int = 50
    offset: int = 0

    @field_validator("status", mode="before")
    @classmethod
    def parse_status(cls, v: object) -> RequestStatusEnum | None:
        if v is None:
            return None
        if isinstance(v, RequestStatusEnum):
            return v
        if isinstance(v, str):
            return RequestStatusEnum[v.upper()]
        raise ValueError(f"Invalid status: {v}")


class ReviewUserRequestRequest(BaseModel):
    status: RequestStatusEnum
    reviewComment: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def parse_status(cls, v: object) -> RequestStatusEnum:
        if isinstance(v, RequestStatusEnum):
            return v
        if isinstance(v, str):
            return RequestStatusEnum[v.upper()]
        raise ValueError(f"Invalid status: {v}")
