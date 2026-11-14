from dataclasses import dataclass, field
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
    additional_metrics: dict[str, int] = field(default_factory=dict[str, int])


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
    "morning",
    "midday",
    "afternoon",
    "evening",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "winter",
    "spring",
    "summer",
    "autumn",
    "new_year",
    "leap_day",
    "music_day",
    "halloween",
    "year_end",
    "months_active",
    "years_active",
    "weeks_active",
    "all_hours",
    "all_weekdays",
    "music_months",
    "repeats",
    "favorites",
    "deep_rotation",
    "library_songs",
    "library_albums",
    "library_artists",
    "library_playlists",
    "library_radios",
    "library_videos",
    "library_total",
    "library_diversity",
    "share_reach",
    "shared_discoveries",
    "recommendations_received",
    "curators",
    "sharing_days",
    "album_shares",
    "artist_shares",
    "playlist_shares",
    "radio_shares",
    "video_shares",
    "song_shares",
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
