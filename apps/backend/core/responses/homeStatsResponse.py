from pydantic import BaseModel

from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.mediaResponse import MediaResponse


class HomeStatsResponse(BaseModel):
    songsByTimePlayed: list[BaseSongWithAlbumResponse]
    randomSongsLastMonth: list[BaseSongWithAlbumResponse]
    nostalgicMix: list[BaseSongWithAlbumResponse]
    hiddenGems: list[BaseSongWithAlbumResponse]
    communityTop: list[BaseSongWithAlbumResponse]
    monthlyTop: list[BaseSongWithAlbumResponse]
    moodSongs: list[BaseSongWithAlbumResponse]
    currentStreak: int = 0
    minutesListenedThisWeek: float = 0.0
    recentlyClickedMedia: list[MediaResponse] = []
