from pydantic import BaseModel


class FriendStatsResponse(BaseModel):
    username: str
    imageUrl: str | None = None
    minutesListened: float = 0
    songsListened: int = 0
    currentStreak: int = 0
    level: int = 1
    xp: int = 0


class CompareStatsResponse(BaseModel):
    myStats: FriendStatsResponse
    friendStats: FriendStatsResponse
    vibeScore: int = 0
    vibeDescriptor: str = ""
