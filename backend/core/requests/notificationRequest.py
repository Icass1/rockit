from typing import Literal
from pydantic import Field
from backend.core.baseModel import BaseModel


class NotificationActivityRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    type: int = Field(ge=0, le=3)
    detail: str | None = Field(default=None, max_length=2000)
    key: str = Field(min_length=1, max_length=150)


class NotificationsReadRequest(BaseModel):
    ids: list[str] = Field(max_length=100)


class LegacyNotificationRequest(BaseModel):
    id: int
    message: str = Field(min_length=1, max_length=2000)
    type: int = Field(ge=0, le=3)
    category: Literal["activity", "download", "import", "release"]
    createdAt: int = Field(ge=0, le=4102444800000)
    read: bool
    key: str | None = Field(default=None, max_length=200)
    detail: str | None = Field(default=None, max_length=2000)


class LegacyNotificationsRequest(BaseModel):
    items: list[LegacyNotificationRequest] = Field(max_length=100)
