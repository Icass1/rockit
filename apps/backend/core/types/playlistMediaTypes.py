from datetime import datetime
from typing import TypeVar

from core.baseModel import BaseModel

T = TypeVar("T")


class PlaylistResponseItem[T](BaseModel):
    item: T
    addedAt: datetime
    expanded: bool = False
