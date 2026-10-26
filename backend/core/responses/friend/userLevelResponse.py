from typing import List

from pydantic import BaseModel, Field


class LevelConfig(BaseModel):
    level: int
    xpRequired: int
    title: str


class ListeningMilestoneResponse(BaseModel):
    minutes: int
    xp: int
    reached: bool


class UserLevelResponse(BaseModel):
    userId: str
    username: str
    imageUrl: str | None = None
    level: int
    xp: int
    xpToNext: int = 0
    title: str = ""
    streak: int = 0
    songsListened: int = 0
    levelStartXp: int = 0
    totalListeningSeconds: int = 0
    sessionListeningSeconds: int = 0
    listeningMilestones: list[ListeningMilestoneResponse] = Field(default_factory=list)


class LeaderboardResponse(BaseModel):
    entries: List[UserLevelResponse]
    currentUser: UserLevelResponse | None = None
