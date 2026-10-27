from abc import ABC, abstractmethod

from core.aResult import AResult
from core.framework.models.recommendation import (
    ExternalRecommendationContext,
    ExternalSuggestion,
)
from core.framework.provider.baseProvider import BaseProvider


class BaseExternalRecommendationProvider(BaseProvider, ABC):
    """A source of track suggestions outside this Rockit instance.

    Implementations only turn a context into (artist, track) suggestions;
    caching, fallback, timeouts, deduplication and matching against the local
    library are handled once by ExternalRecommendations, so a provider can be
    replaced without touching the ranking code.

    Contract for get_suggestions_async:
      - OK with a (possibly empty) list when the service answered;
      - a non-OK AResult for anything else (HTTP error, timeout, rate limit,
        invalid data). It must not raise.
    """

    # Stable identifier used in cache keys.
    key: str
    # Name shown to users next to suggestions.
    display_name: str

    @abstractmethod
    def is_configured(self) -> bool:
        """Whether the instance has what this provider needs (e.g. an API
        key). Unconfigured providers are skipped silently."""

    @abstractmethod
    def can_serve(self, context: ExternalRecommendationContext) -> bool:
        """Whether this provider can answer the given context."""

    @abstractmethod
    def cache_key(self, context: ExternalRecommendationContext) -> str:
        """Stable key identifying the answer for this context."""

    @abstractmethod
    async def get_suggestions_async(
        self, context: ExternalRecommendationContext, limit: int
    ) -> AResult[list[ExternalSuggestion]]:
        """Fetch suggestions from the service (see class docstring)."""
