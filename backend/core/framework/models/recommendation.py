from dataclasses import dataclass, field
from enum import Enum


@dataclass(frozen=True)
class LocalCandidate:
    """A song known to this instance plus the raw signals the local engine
    ranks it by. Every signal defaults to "absent" so sparse metadata (no
    artist, no album, no genres, no plays) is always representable."""

    media_id: int
    public_id: str
    # Stable keys used only for diversity (not shown to the user). None when
    # the provider has no artist/album data for this song.
    artist_key: str | None = None
    album_key: str | None = None
    # Number of playlists the candidate shares with a seed song.
    playlist_co: int = 0
    # Number of times it was played within a listening session of a seed.
    session_co: int = 0
    # Number of distinct seed artists credited on the candidate.
    shared_artists: int = 0
    # The candidate is on the same album as a seed song.
    same_album: bool = False
    # Number of distinct seed genres the candidate shares.
    shared_genres: int = 0
    # Total plays across all users of this instance.
    play_count: int = 0
    # Personal repetition penalty over the last two weeks.
    recent_user_plays: int = 0


@dataclass(frozen=True)
class SeedTrack:
    """A plain (artist, track) pair used to seed similarity lookups."""

    artist_name: str
    track_name: str


@dataclass(frozen=True)
class ExternalSuggestion:
    """A provider-agnostic track suggestion from an external service.

    Identifiers are preserved when the provider supplies them, but nothing
    downstream depends on them: matching and downloading go through the
    artist and track names, the only metadata every provider has."""

    artist_name: str
    track_name: str
    score: float = 0.0
    recording_mbid: str | None = None
    album_name: str | None = None


class ERecommendationContextKind(Enum):
    # Personalized feed for one user ("For you").
    USER = "user"
    # Similar to one seed track (related songs, playlist suggestions).
    SEED = "seed"


@dataclass(frozen=True)
class ExternalRecommendationContext:
    """Everything an external provider may use. Deliberately small: only
    what the user explicitly configured (their ListenBrainz username) and a
    single seed track are ever available to external services."""

    kind: ERecommendationContextKind
    seed: SeedTrack | None = None
    listenbrainz_username: str | None = None


class EExternalStatus(Enum):
    # The user has not opted in, or no provider is configured.
    DISABLED = "disabled"
    # A provider returned usable suggestions.
    OK = "ok"
    # Providers answered but had nothing usable for this context.
    EMPTY = "empty"
    # Every provider that was tried failed (timeout, HTTP error, rate limit,
    # invalid data). Local recommendations are still served.
    UNAVAILABLE = "unavailable"


@dataclass
class ExternalRecommendationResult:
    status: EExternalStatus
    provider_name: str | None = None
    suggestions: list[ExternalSuggestion] = field(
        default_factory=lambda: list[ExternalSuggestion]()
    )
