from typing import List, Literal
from datetime import datetime

from pydantic import BaseModel, Field


class LevelConfig(BaseModel):
    level: int
    xpRequired: int
    title: str


class ListeningMilestoneResponse(BaseModel):
    minutes: int
    xp: int
    reached: bool


class ListeningBadgeResponse(BaseModel):
    key: str
    titleKey: str
    descriptionKey: str
    scope: Literal["session", "total"]
    targetMinutes: int
    earnedAt: datetime | None = None


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
    listeningBadges: list[ListeningBadgeResponse] = Field(default_factory=list)
    listeningMilestones: list[ListeningMilestoneResponse] = Field(default_factory=list)


class LeaderboardResponse(BaseModel):
    entries: List[UserLevelResponse]
    currentUser: UserLevelResponse | None = None
