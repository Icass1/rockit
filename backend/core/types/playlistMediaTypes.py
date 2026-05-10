from typing import Generic, TypeVar
from datetime import datetime

from pydantic import BaseModel

T = TypeVar("T")


class PlaylistResponseItem(BaseModel, Generic[T]):
    item: T
    addedAt: datetime
