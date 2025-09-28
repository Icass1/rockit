from typing import List
from pydantic import BaseModel

from backend.responses.general.songWithAlbum import RockItSongWithAlbumResponse



class HomeStatsResponse(BaseModel):
    songsByTimePlayed: List[RockItSongWithAlbumResponse]
    randomSongsLastMonth: List[RockItSongWithAlbumResponse]
    nostalgicMix: List[RockItSongWithAlbumResponse]
    hiddenGems: List[RockItSongWithAlbumResponse]
    communityTop: List[RockItSongWithAlbumResponse]
    monthlyTop: List[RockItSongWithAlbumResponse]
    moodSongs: List[RockItSongWithAlbumResponse]
