from dataclasses import dataclass
from datetime import datetime
from typing import Literal


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
    unique_recordings: int = 0
    recommendations: int = 0
    friends: int = 0
    videos: int = 0
    active_days: int = 0
    night_listens: int = 0
    early_listens: int = 0
    weekend_listens: int = 0
    joined_at: datetime | None = None


ListeningBadgeScope = Literal[
    "session",
    "total",
    "plays",
    "discovery",
    "streak",
    "sharing",
    "friends",
    "videos",
    "mixed",
    "active_days",
    "night",
    "early",
    "weekend",
    "tenure",
    "anniversary",
    "secrets",
]


ListeningBadgeLeague = Literal["bronze", "silver", "gold", "platinum", "diamond", "legend"]


@dataclass(frozen=True)
class ListeningBadgeFamily:
    scope: ListeningBadgeScope
    targets: tuple[int, ...]
    visual_variant: str


@dataclass(frozen=True)
class ListeningBadgeDefinition:
    key: str
    scope: ListeningBadgeScope
    target: int
    title_key: str
    description_key: str
    visual_variant: str
    tier: int
    league: ListeningBadgeLeague = "gold"
    secret: bool = False
    metric: ListeningBadgeScope | None = None
