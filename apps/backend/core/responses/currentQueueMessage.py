from typing import Literal

from core.baseModel import BaseModel
from core.models.queueItem import QueueItem


class CurrentQueueMessageItem(QueueItem):
    pass


class CurrentQueueMessage(BaseModel):
    type: Literal["current_queue"] = "current_queue"
    queue: list[QueueItem]
