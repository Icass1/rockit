from typing import List, Literal

from backend.core.baseModel import BaseModel
from backend.core.models.queueItem import QueueItem


class CurrentQueueMessageItem(QueueItem):
    pass


class CurrentQueueMessage(BaseModel):
    type: Literal["current_queue"] = "current_queue"
    queue: List[QueueItem]
