from typing import List
from pydantic import BaseModel

from backend.responses.general.song import RockItSongResponse


class HomeStatsResponse(BaseModel):
    songsByTimePlayed: List[RockItSongResponse]
    randomSongsLastMonth: List[RockItSongResponse]
    nostalgicMix: List[RockItSongResponse]
    hiddenGems: List[RockItSongResponse]
    communityTop: List[RockItSongResponse]
    monthlyTop: List[RockItSongResponse]
    moodSongs: List[RockItSongResponse]
