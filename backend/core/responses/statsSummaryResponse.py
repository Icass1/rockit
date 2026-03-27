from pydantic import BaseModel


class StatsSummaryResponse(BaseModel):
    songsListened: int
    minutesListened: float
    avgMinutesPerSong: float
    currentStreak: int
    topGenre: str = ""
