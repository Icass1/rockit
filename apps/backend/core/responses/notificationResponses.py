import re
from datetime import datetime
from typing import Literal

from pydantic import Field

from backend.core.access.db.ormModels.notification import NotificationRow
from pydantic import BaseModel as IBaseModel

NotificationEventKey = Literal[
    "APPLICATION_MESSAGE", "DOWNLOAD_COMPLETED", "DOWNLOAD_FAILED", "BUILD_PUBLISHED"
]


class NotificationDestination(IBaseModel):
    path: str = Field(pattern=re.compile(r"^/(?!/)[^\\\x00-\x20]*$"))


class NotificationDestinationResponse(IBaseModel):
    url: str
    newTab: bool


class NotificationReplacement(IBaseModel):
    key: str
    value: str


class NotificationEventResponse(IBaseModel):
    key: NotificationEventKey
    vocabularyKey: str


class NotificationSubscriptionsResponse(IBaseModel):
    eventKeys: list[NotificationEventKey]


class NotificationResponse(IBaseModel):
    publicId: str
    eventKey: str
    vocabularyKey: str
    replacements: list[NotificationReplacement]
    dateAdded: datetime
    readAt: datetime | None
    destination: NotificationDestination | None = None

    @staticmethod
    def from_row(row: NotificationRow) -> "NotificationResponse":
        return NotificationResponse(
            publicId=row.public_id,
            eventKey=row.event_key,
            vocabularyKey=row.vocabulary_key,
            replacements=[
                NotificationReplacement.model_validate(value)
                for value in row.replacements
            ],
            dateAdded=row.date_added,
            readAt=row.read_at,
            destination=(
                NotificationDestination.model_validate(row.destination)
                if row.destination is not None
                else None
            ),
        )


class NotificationPageResponse(IBaseModel):
    items: list[NotificationResponse]
    unreadCount: int
    totalCount: int


class NotificationEventsResponse(IBaseModel):
    events: list[NotificationEventResponse]


class NotificationUserResponse(IBaseModel):
    publicId: str
    username: str


class NotificationUsersResponse(IBaseModel):
    users: list[NotificationUserResponse]
