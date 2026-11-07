from pydantic import BaseModel, field_validator

from core.enums.requestStatusEnum import RequestStatusEnum
from core.enums.requestTypeEnum import RequestTypeEnum


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
            try:
                return RequestTypeEnum[v.upper()]
            except KeyError as exc:
                raise ValueError("Invalid request type") from exc
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
            try:
                return RequestStatusEnum[v.upper()]
            except KeyError as exc:
                raise ValueError("Invalid request status") from exc
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
            try:
                return RequestStatusEnum[v.upper()]
            except KeyError as exc:
                raise ValueError("Invalid request status") from exc
        raise ValueError(f"Invalid status: {v}")
