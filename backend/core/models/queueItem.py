from backend.core.baseModel import BaseModel


class QueueItem(BaseModel):
    mediaPublicId: str
    listPublicId: str | None = None
    queueMediaId: int
    randomIndex: int
    sortedIndex: int
