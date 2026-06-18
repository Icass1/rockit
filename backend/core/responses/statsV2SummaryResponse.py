from pydantic import BaseModel


class StatsV2SummaryResponse(BaseModel):
    uniqueMediasListened: int
    uniqueSongsListened: int
    uniqueVideosListened: int
    totalListenSessions: int
    totalPlayTimeMs: int
    totalPlayTimeMinutes: float
    avgPlayTimePerMediaMs: float
    currentStreak: int
