from pydantic import BaseModel


class StatsSummaryResponse(BaseModel):
    mediasListened: int
    songsListened: int
    videosListened: int
    minutesListened: float
    avgMinutesPerSong: float
    currentStreak: int
