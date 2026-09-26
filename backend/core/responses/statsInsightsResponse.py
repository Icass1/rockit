from pydantic import BaseModel


class StatsInsightsResponse(BaseModel):
    activeDays: int
    longestStreak: int
    longestSessionMs: int
    averageSessionMs: float
    completionRate: float
    replayRate: float
    discoveryCount: int
    likesAdded: int
    libraryAdds: int
    skips: int
    seekCount: int
    minutesSkipped: float
    peakHour: int | None
    peakDay: str | None
    nightOwlMinutes: float
    earlyBirdMinutes: float
