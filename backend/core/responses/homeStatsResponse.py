from typing import List
from pydantic import BaseModel

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class HomeStatsResponse(BaseModel):
    songsByTimePlayed: List[BaseSongWithAlbumResponse]
    randomSongsLastMonth: List[BaseSongWithAlbumResponse]
    nostalgicMix: List[BaseSongWithAlbumResponse]
    hiddenGems: List[BaseSongWithAlbumResponse]
    communityTop: List[BaseSongWithAlbumResponse]
    monthlyTop: List[BaseSongWithAlbumResponse]
    moodSongs: List[BaseSongWithAlbumResponse]
