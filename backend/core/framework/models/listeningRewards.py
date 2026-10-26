from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ListeningMilestone:
    minutes: int
    xp: int


@dataclass(frozen=True)
class ListeningXpAward:
    event_key: str
    xp: int


@dataclass(frozen=True)
class ListeningProgressUpdate:
    session_id: str
    session_ms: int
    total_ms: int
    playback_id: str
    position_ms: int
    observed_at: datetime
    active_at: datetime


@dataclass(frozen=True)
class ListeningRewardSummary:
    total_ms: int = 0
    session_ms: int = 0
    recorded_listens: int = 0
