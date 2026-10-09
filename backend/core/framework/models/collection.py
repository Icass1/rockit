from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class CollectionRecord:
    id: int
    public_id: str
    provider_id: int
    media_type_key: int
    name: str
    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class CollectionEntry:
    parent_id: int
    media_id: int
    position: int
    added_at: datetime
    expanded: bool = False
