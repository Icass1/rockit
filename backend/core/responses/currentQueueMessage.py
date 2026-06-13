from typing import List, Literal

from backend.core.baseModel import BaseModel


class CurrentQueueMessageItem(BaseModel):
    mediaPublicId: str
    listPublicId: str | None = None
    queueMediaId: int
    randomIndex: int
    sortedIndex: int


class CurrentQueueMessage(BaseModel):
    type: Literal["current_queue"] = "current_queue"
    queue: List[CurrentQueueMessageItem]
