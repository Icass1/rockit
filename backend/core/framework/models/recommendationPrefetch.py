from dataclasses import dataclass


@dataclass(frozen=True)
class RecommendationPrefetchState:
    locked: bool
    pending_count: int = 0
    media_pending: bool = False
