from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongResponse import BaseSongResponse


class StatsResponse(BaseModel):
    songs: List[BaseSongResponse]
