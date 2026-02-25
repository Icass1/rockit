from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongResponse import BaseSongResponse


class HomeStatsResponse(BaseModel):
    songsByTimePlayed: List[BaseSongResponse]
    randomSongsLastMonth: List[BaseSongResponse]
    nostalgicMix: List[BaseSongResponse]
    hiddenGems: List[BaseSongResponse]
    communityTop: List[BaseSongResponse]
    monthlyTop: List[BaseSongResponse]
    moodSongs: List[BaseSongResponse]
