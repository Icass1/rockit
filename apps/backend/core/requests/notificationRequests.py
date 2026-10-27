from core.baseModel import BaseModel as IBaseModel
from core.responses.notificationResponses import NotificationEventKey


class UpdateNotificationSubscriptionsRequest(IBaseModel):
    eventKeys: list[NotificationEventKey]
