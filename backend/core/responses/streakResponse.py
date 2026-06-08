from pydantic import BaseModel


class StreakResponse(BaseModel):
    currentStreak: int
