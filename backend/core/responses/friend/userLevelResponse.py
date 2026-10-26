from typing import List
from datetime import datetime
from backend.core.framework.models.listeningRewards import (
    ListeningBadgeScope,
    ListeningBadgeDifficulty,
)

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
    scope: ListeningBadgeScope
    targetMinutes: int = 0
    target: int
    current: int = 0
    difficulty: ListeningBadgeDifficulty
    visualVariant: str
    tier: int
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
    listeningBadges: list[ListeningBadgeResponse] = Field(
        default_factory=list[ListeningBadgeResponse]
    )
    listeningMilestones: list[ListeningMilestoneResponse] = Field(
        default_factory=list[ListeningMilestoneResponse]
    )


class LeaderboardResponse(BaseModel):
    entries: List[UserLevelResponse]
    currentUser: UserLevelResponse | None = None
