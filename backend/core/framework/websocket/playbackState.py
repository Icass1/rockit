from dataclasses import dataclass

LISTENED_THRESHOLD_PERCENT = 0.9
FLUSH_INTERVAL_SECONDS = 30


@dataclass
class UserPlaybackState:
    media_public_id: str = ""
    last_time_ms: int = 0
    last_timestamp: float = 0.0
    has_reached_listen_threshold: bool = False
    active_interval_start_ms: int | None = None
    active_interval_media_id: int | None = None
    active_interval_db_id: int | None = None
    active_interval_start_timestamp: float | None = None
    active_interval_last_flush_timestamp: float | None = None
