from typing import Literal

from pydantic import Field

from core.baseModel import BaseModel


class NotificationResponse(BaseModel):
    id: str
    message: str
    type: int = Field(ge=0, le=3)
    category: Literal["activity", "download", "import", "release"]
    createdAt: int
    read: bool
    key: str
    detail: str | None = None


class NotificationsResponse(BaseModel):
    items: list[NotificationResponse]
