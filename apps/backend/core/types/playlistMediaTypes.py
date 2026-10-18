from typing import Generic, TypeVar
from datetime import datetime

from backend.core.baseModel import BaseModel

T = TypeVar("T")


class PlaylistResponseItem(BaseModel, Generic[T]):
    item: T
    addedAt: datetime
    expanded: bool = False
