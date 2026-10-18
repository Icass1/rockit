from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from math import log1p
import unicodedata

from backend.core.framework.models.recommendation import RecommendationCandidate

# Affinity uses real likes, repeat listens (log-capped), recency and library saves.
LIKE_WEIGHT = 4.0
LISTEN_WEIGHT = 2.0
RECENCY_WEIGHT = 2.0
LIBRARY_WEIGHT = 1.0
ALBUM_WEIGHT = 0.35
ARTIST_REPEAT_PENALTY = 0.2
ALBUM_REPEAT_PENALTY = 0.35


def normalize(value: str) -> str:
    """Normalize Unicode, casing and whitespace without conflating different titles."""
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def identity(track: RecommendationCandidate) -> tuple[str, tuple[str, ...]]:
    return normalize(track.name), tuple(
        sorted({normalize(a) for a in track.artists if normalize(a)})
    )


class LocalRecommendation:
    @staticmethod
    def rank(
        candidates: list[RecommendationCandidate],
        limit: int = 20,
        excluded: set[str] | None = None,
        external: list[tuple[str, str]] | None = None,
        now: datetime | None = None,
    ) -> list[str]:
        """Deterministic metadata heuristics; O(catalog size * bounded result count)."""
        now = now or datetime.now(timezone.utc)
        excluded = excluded or set()
        artists: defaultdict[str, float] = defaultdict(float)
        albums: defaultdict[str, float] = defaultdict(float)
        recent_keys: set[tuple[str, tuple[str, ...]]] = set()
        external_ranks = {
            (normalize(name), normalize(artist)): index
            for index, (name, artist) in reversed(list(enumerate(external or [])))
        }
        for track in candidates:
            last = track.last_played
            if last is not None and last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            days = max(0.0, (now - last).total_seconds() / 86400) if last else 90.0
            if (
                track.current
                or track.public_id in excluded
                or (last is not None and last >= now - timedelta(hours=24))
            ):
                recent_keys.add(identity(track=track))
            strength = (
                LIKE_WEIGHT * track.liked
                + LISTEN_WEIGHT * log1p(min(track.plays, 50))
                + RECENCY_WEIGHT / (1 + days / 14) * bool(last)
                + LIBRARY_WEIGHT * track.in_library
            )
            for artist in identity(track=track)[1]:
                artists[artist] += strength
            if normalize(track.album):
                albums[normalize(track.album)] += strength
        peak_artist = max(artists.values(), default=1.0) or 1.0
        peak_album = max(albums.values(), default=1.0) or 1.0
        scored: list[tuple[RecommendationCandidate, float]] = []
        seen: set[tuple[str, tuple[str, ...]]] = set()
        # Stable choice of provider when the same recording is stored twice.
        for track in sorted(candidates, key=lambda t: (t.in_library, t.public_id)):
            key = identity(track=track)
            if (
                not track.playable
                or not key[0]
                or track.public_id in excluded
                or track.current
                or key in recent_keys
                or key in seen
            ):
                continue
            seen.add(key)
            affinity = max((artists[a] / peak_artist for a in key[1]), default=0.0)
            album_affinity = (
                albums[normalize(track.album)] / peak_album
                if normalize(track.album)
                else 0.0
            )
            boost = max(
                (
                    2.0 / (1 + external_ranks[(key[0], a)] / 10)
                    for a in key[1]
                    if (key[0], a) in external_ranks
                ),
                default=0.0,
            )
            # Unknown-to-user tracks lead; familiar tracks can still fill a sparse catalog.
            score = 1 + affinity + ALBUM_WEIGHT * album_affinity + boost
            score *= 0.5 if track.in_library or track.liked else 1.0
            scored.append((track, score))
        chosen: list[str] = []
        artist_counts: Counter[str] = Counter()
        album_counts: Counter[str] = Counter()
        while scored and len(chosen) < max(0, min(limit, 50)):

            def sort_key(
                item: tuple[RecommendationCandidate, float],
            ) -> tuple[float, str]:
                track, score = item
                repeats = max(
                    (artist_counts[a] for a in identity(track=track)[1]), default=0
                )
                album_repeats = (
                    album_counts[normalize(track.album)]
                    if normalize(track.album)
                    else 0
                )
                return (
                    -score
                    * ARTIST_REPEAT_PENALTY**repeats
                    * ALBUM_REPEAT_PENALTY**album_repeats,
                    track.public_id,
                )

            best = min(scored, key=sort_key)
            scored.remove(best)
            track = best[0]
            chosen.append(track.public_id)
            artist_counts.update(identity(track=track)[1])
            if normalize(track.album):
                album_counts[normalize(track.album)] += 1
        return chosen
