from typing import List
from pydantic import BaseModel, Field

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class HomeStatsResponse(BaseModel):
    songsByTimePlayed: List[BaseSongWithAlbumResponse] = Field(default_factory=list)
    randomSongsLastMonth: List[BaseSongWithAlbumResponse] = Field(default_factory=list)
    nostalgicMix: List[BaseSongWithAlbumResponse] = Field(default_factory=list)
    hiddenGems: List[BaseSongWithAlbumResponse] = Field(default_factory=list)
    communityTop: List[BaseSongWithAlbumResponse] = Field(default_factory=list)
    monthlyTop: List[BaseSongWithAlbumResponse] = Field(default_factory=list)
    moodSongs: List[BaseSongWithAlbumResponse] = Field(default_factory=list)
