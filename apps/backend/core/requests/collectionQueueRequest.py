from core.baseModel import BaseModel


class CollectionQueueRequest(BaseModel):
    startPublicId: str | None = None
