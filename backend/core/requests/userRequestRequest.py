from pydantic import BaseModel


class CreateUserRequestRequest(BaseModel):
    mediaPublicId: str | None = None
    requestType: str
    proposedValue: str
    comment: str | None = None


class ReviewUserRequestRequest(BaseModel):
    status: str
    reviewComment: str | None = None
