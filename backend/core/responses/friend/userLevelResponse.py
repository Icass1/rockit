from typing import List

from pydantic import BaseModel


class LevelConfig(BaseModel):
    level: int
    xpRequired: int
    title: str


class UserLevelResponse(BaseModel):
    userId: str
    username: str
    imageUrl: str | None = None
    level: int
    xp: int
    xpToNext: int = 0
    title: str = ""
    streak: int = 0


class LeaderboardResponse(BaseModel):
    entries: List[UserLevelResponse]
    currentUser: UserLevelResponse | None = None
