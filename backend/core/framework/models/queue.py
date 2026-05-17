from dataclasses import dataclass


@dataclass
class QueueItem:
    media_id: int
    queue_id: int
    list_id: int | None
    sorted_index: int
    random_index: int
