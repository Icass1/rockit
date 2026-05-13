from dataclasses import dataclass

from backend.core.enums.queueTypeEnum import QueueTypeEnum


@dataclass
class QueueItem:
    media_id: int
    queue_id: int
    queue_type: QueueTypeEnum
    list_id: int
