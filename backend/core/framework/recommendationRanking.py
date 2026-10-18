"""Deterministic, heuristic ranking for local recommendations.

This is plain weighted scoring plus a greedy diversity pass — not machine
learning. Every input is a count Rockit already stores (playlists, listening
sessions, artist/album/genre metadata, play counts), so results are cheap,
explainable and work fully offline.

score = PLAYLIST_WEIGHT   * log1p(shared playlists with a seed)
      + SESSION_WEIGHT    * log1p(co-plays within a listening session)
      + ARTIST_WEIGHT     * min(shared seed artists, ARTIST_MATCH_CAP)
      + ALBUM_WEIGHT      * (same album as a seed)
      + GENRE_WEIGHT      * log1p(shared seed genres)
      + POPULARITY_WEIGHT * log1p(plays across the instance)

log1p dampens raw counts so one very active user or one huge playlist cannot
drown out every other signal. Ties break on public_id, so the same inputs
always produce the same order.
"""

import math
import re
import unicodedata
from typing import Callable, Hashable, Iterable, TypeVar

from backend.core.framework.models.recommendation import (
    ExternalSuggestion,
    LocalCandidate,
)

T = TypeVar("T")

# Explicit user behaviour (curating playlists, listening back to back) is the
# strongest signal; metadata similarity comes next; popularity only nudges
# ties and powers the cold-start fallback.
PLAYLIST_WEIGHT = 3.0
SESSION_WEIGHT = 2.0
ARTIST_WEIGHT = 1.5
ARTIST_MATCH_CAP = 2
ALBUM_WEIGHT = 0.75
GENRE_WEIGHT = 1.0
POPULARITY_WEIGHT = 0.25

# Diversity: each extra pick from the same artist/album multiplies the
# candidate's score by these factors, and no artist may take more than
# MAX_ARTIST_SHARE of the list while alternatives remain.
ARTIST_REPEAT_PENALTY = 0.6
ALBUM_REPEAT_PENALTY = 0.8
MAX_ARTIST_SHARE = 0.3

# Bracketed or dash-suffixed decorations that do not change what the track
# is: "(feat. X)", "[Remastered 2011]", "- Radio Edit"...
_DECORATION_RE = re.compile(
    r"[\(\[][^\)\]]*(feat\.?|ft\.?|with|remaster(ed)?|radio edit|version)[^\)\]]*[\)\]]"
    r"|\s-\s.*(remaster(ed)?|radio edit|version).*$",
    re.IGNORECASE,
)
_NON_ALNUM_RE = re.compile(r"[^0-9a-z]+")


class RecommendationRanking:
    @staticmethod
    def normalize_text(value: str | None) -> str:
        """Lowercase, accent-free, punctuation-free form of a name, used to
        compare artists and titles coming from different providers."""

        if not value:
            return ""

        without_decorations = _DECORATION_RE.sub(" ", value)
        decomposed = unicodedata.normalize("NFKD", without_decorations)
        ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
        return _NON_ALNUM_RE.sub(" ", ascii_only.casefold()).strip()

    @staticmethod
    def score_candidate(candidate: LocalCandidate) -> float:
        """Weighted sum of a candidate's signals (see module docstring)."""

        return (
            PLAYLIST_WEIGHT * math.log1p(max(candidate.playlist_co, 0))
            + SESSION_WEIGHT * math.log1p(max(candidate.session_co, 0))
            + ARTIST_WEIGHT * min(max(candidate.shared_artists, 0), ARTIST_MATCH_CAP)
            + (ALBUM_WEIGHT if candidate.same_album else 0.0)
            + GENRE_WEIGHT * math.log1p(max(candidate.shared_genres, 0))
            + POPULARITY_WEIGHT * math.log1p(max(candidate.play_count, 0))
        )

    @staticmethod
    def diversify(
        items: list[T],
        scores: list[float],
        limit: int,
        artist_key: Callable[[T], Hashable | None],
        album_key: Callable[[T], Hashable | None] = lambda _: None,
    ) -> list[T]:
        """Greedy re-rank that trades a little relevance for variety.

        At each step picks the item with the best score after repeat
        penalties for artists/albums already picked. Items without an
        artist/album key are never penalized. An artist that already holds
        MAX_ARTIST_SHARE of the list is skipped while other items remain,
        so the list is only allowed to concentrate when nothing else is
        available. `items` must already be in priority order; that order
        breaks ties, keeping the result deterministic.

        O(limit * len(items)), which is fine for the bounded candidate pools
        the engine works with.
        """

        if limit <= 0 or not items:
            return []

        max_per_artist = max(1, math.ceil(limit * MAX_ARTIST_SHARE))
        remaining: list[tuple[T, float]] = list(zip(items, scores))
        picked: list[T] = []
        artist_counts: dict[Hashable, int] = {}
        album_counts: dict[Hashable, int] = {}

        while remaining and len(picked) < limit:
            best_idx = -1
            best_score = -math.inf
            fallback_idx = -1
            fallback_score = -math.inf

            for idx, (item, score) in enumerate(remaining):
                a_key = artist_key(item)
                al_key = album_key(item)
                a_count = artist_counts.get(a_key, 0) if a_key is not None else 0
                al_count = album_counts.get(al_key, 0) if al_key is not None else 0
                adjusted = (
                    score
                    * (ARTIST_REPEAT_PENALTY**a_count)
                    * (ALBUM_REPEAT_PENALTY**al_count)
                )
                # Scores can be 0 (no signal at all); keep penalties
                # meaningful by sinking repeats below fresh items.
                adjusted -= a_count + al_count * 0.5

                if a_count >= max_per_artist:
                    if adjusted > fallback_score:
                        fallback_idx, fallback_score = idx, adjusted
                    continue

                if adjusted > best_score:
                    best_idx, best_score = idx, adjusted

            chosen_idx = best_idx if best_idx >= 0 else fallback_idx
            item, _ = remaining.pop(chosen_idx)
            picked.append(item)

            a_key = artist_key(item)
            if a_key is not None:
                artist_counts[a_key] = artist_counts.get(a_key, 0) + 1
            al_key = album_key(item)
            if al_key is not None:
                album_counts[al_key] = album_counts.get(al_key, 0) + 1

        return picked

    @staticmethod
    def rank_local_candidates(
        candidates: Iterable[LocalCandidate],
        limit: int,
        exclude_public_ids: set[str] | None = None,
    ) -> list[str]:
        """Score, deduplicate, filter and diversify local candidates.

        Returns at most `limit` public_ids. Duplicates (the same song coming
        from several signal sources) keep their best-scoring entry; excluded
        ids (seeds, the current track, already-played songs) never appear.
        """

        if limit <= 0:
            return []

        excluded: set[str] = exclude_public_ids or set()
        best: dict[str, tuple[LocalCandidate, float]] = {}
        for candidate in candidates:
            if not candidate.public_id or candidate.public_id in excluded:
                continue
            score = RecommendationRanking.score_candidate(candidate)
            current = best.get(candidate.public_id)
            if current is None or score > current[1]:
                best[candidate.public_id] = (candidate, score)

        ordered = sorted(best.values(), key=lambda pair: (-pair[1], pair[0].public_id))

        picked: list[LocalCandidate] = RecommendationRanking.diversify(
            items=[c for c, _ in ordered],
            scores=[s for _, s in ordered],
            limit=limit,
            artist_key=lambda c: c.artist_key,
            album_key=lambda c: c.album_key,
        )
        return [c.public_id for c in picked]

    @staticmethod
    def suggestion_key(artist_name: str, track_name: str) -> tuple[str, str]:
        """Provider-independent identity of an (artist, track) pair."""

        return (
            RecommendationRanking.normalize_text(artist_name),
            RecommendationRanking.normalize_text(track_name),
        )

    @staticmethod
    def rank_external_suggestions(
        suggestions: Iterable[ExternalSuggestion],
        limit: int,
        exclude_keys: set[tuple[str, str]] | None = None,
    ) -> list[ExternalSuggestion]:
        """Clean up a provider's suggestions: drop entries without a usable
        artist or title, duplicates (after normalization) and excluded tracks
        (e.g. the seed), then diversify by artist. The provider's own order
        is kept as the relevance order."""

        if limit <= 0:
            return []

        excluded: set[tuple[str, str]] = exclude_keys or set()
        seen: set[tuple[str, str]] = set()
        valid: list[ExternalSuggestion] = []
        for suggestion in suggestions:
            key = RecommendationRanking.suggestion_key(
                suggestion.artist_name, suggestion.track_name
            )
            if not key[0] or not key[1] or key in seen or key in excluded:
                continue
            seen.add(key)
            valid.append(suggestion)

        # Provider order is the relevance order; turn it into descending
        # scores so diversify can apply its repeat penalties.
        count = len(valid)
        return RecommendationRanking.diversify(
            items=valid,
            scores=[float(count - idx) for idx in range(count)],
            limit=limit,
            artist_key=lambda s: RecommendationRanking.normalize_text(s.artist_name),
        )
