from dataclasses import dataclass
from typing import Any, Coroutine, List

from backend.core.aResult import AResult


@dataclass
class QueueGroupItem:
    """An item in a queue group."""

    queue_id: int
    public_id: str
    sorted_index: int
    random_index: int


@dataclass
class QueueTask:
    """Holds a coroutine task for queue processing with metadata."""

    coroutine: Coroutine[Any, Any, AResult[Any]]
    media_type: str
    provider_id: int
    items: List[QueueGroupItem]


@dataclass
class LibraryTask:
    """Holds a coroutine task for library processing with metadata."""

    coroutine: Coroutine[Any, Any, AResult[Any]]
    media_type: str
    provider_id: int
