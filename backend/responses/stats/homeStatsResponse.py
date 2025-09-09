from datetime import datetime
from typing import List
from pydantic import BaseModel


class ArtistHomeStatsResponse(BaseModel):
    publicId: str
    name: str


class AlbumHomeStatsResponse(BaseModel):
    publicId: str
    name: str


class SongHomeStatsResponse(BaseModel):
    publicId: str
    name: str
    artists: List[ArtistHomeStatsResponse]
    album: AlbumHomeStatsResponse
    playedAt: datetime
    internalImageUrl: str | None

class HomeStatsResponse(BaseModel):
    songsByTimePlayed: List[SongHomeStatsResponse]
    randomSongsLastMonth: List[SongHomeStatsResponse]
    nostalgicMix: List[SongHomeStatsResponse]
    hiddenGems: List[SongHomeStatsResponse]
    communityTop: List[SongHomeStatsResponse]
    monthlyTop: List[SongHomeStatsResponse]
    moodSongs: List[SongHomeStatsResponse]
