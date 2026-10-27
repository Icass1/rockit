import math
import unittest

import tests  # noqa: F401  # pyright: ignore[reportUnusedImport]  (test env setup)
from core.framework.models.recommendation import (
    ExternalSuggestion,
    LocalCandidate,
)
from core.framework.recommendationRanking import (
    MAX_ARTIST_SHARE,
    RecommendationRanking,
)


def candidate(
    public_id: str,
    artist: str | None = None,
    album: str | None = None,
    **signals: int,
) -> LocalCandidate:
    return LocalCandidate(
        media_id=hash(public_id) % 100000,
        public_id=public_id,
        artist_key=artist,
        album_key=album,
        **signals,  # type: ignore[arg-type]
    )


class LocalRankingTests(unittest.TestCase):
    def test_empty_input_returns_empty_list(self) -> None:
        self.assertEqual(RecommendationRanking.rank_local_candidates([], limit=10), [])

    def test_non_positive_limit_returns_empty_list(self) -> None:
        items = [candidate("a", playlist_co=1)]
        self.assertEqual(RecommendationRanking.rank_local_candidates(items, limit=0), [])
        self.assertEqual(RecommendationRanking.rank_local_candidates(items, limit=-3), [])

    def test_listening_behaviour_outranks_popularity(self) -> None:
        items = [
            candidate("popular", artist="x", play_count=500),
            candidate("co-played", artist="y", session_co=3),
            candidate("same-playlist", artist="z", playlist_co=2),
        ]
        ranked = RecommendationRanking.rank_local_candidates(items, limit=3)
        self.assertEqual(ranked[-1], "popular")
        self.assertEqual(set(ranked[:2]), {"co-played", "same-playlist"})

    def test_metadata_similarity_counts_without_history(self) -> None:
        items = [
            candidate("unrelated", artist="a"),
            candidate("same-genre", artist="b", shared_genres=2),
            candidate("same-artist", artist="c", shared_artists=1),
        ]
        ranked = RecommendationRanking.rank_local_candidates(items, limit=3)
        self.assertEqual(ranked, ["same-artist", "same-genre", "unrelated"])

    def test_ranking_is_deterministic_and_ties_break_on_public_id(self) -> None:
        items = [candidate(pid, artist=pid, playlist_co=1) for pid in "dbca"]
        first = RecommendationRanking.rank_local_candidates(items, limit=4)
        second = RecommendationRanking.rank_local_candidates(list(reversed(items)), limit=4)
        self.assertEqual(first, ["a", "b", "c", "d"])
        self.assertEqual(first, second)

    def test_duplicates_and_exclusions_are_removed(self) -> None:
        items = [
            candidate("dup", artist="a", playlist_co=1),
            candidate("dup", artist="a", playlist_co=5),
            candidate("seed", artist="b", playlist_co=9),
            candidate("", artist="c", playlist_co=9),
            candidate("other", artist="d", playlist_co=1),
        ]
        ranked = RecommendationRanking.rank_local_candidates(
            items, limit=10, exclude_public_ids={"seed"}
        )
        self.assertEqual(ranked, ["dup", "other"])

    def test_sparse_metadata_is_handled(self) -> None:
        items = [candidate("no-metadata"), candidate("also-none", play_count=1)]
        ranked = RecommendationRanking.rank_local_candidates(items, limit=5)
        self.assertEqual(ranked, ["also-none", "no-metadata"])

    def test_one_artist_cannot_dominate_the_list(self) -> None:
        # Ten strong songs by one artist, ten much weaker ones by others.
        items = [candidate(f"star-{i}", artist="star", playlist_co=10) for i in range(10)] + [
            candidate(f"other-{i}", artist=f"o{i}", playlist_co=1) for i in range(10)
        ]

        limit = 10
        ranked = RecommendationRanking.rank_local_candidates(items, limit=limit)

        star_count = sum(1 for pid in ranked if pid.startswith("star"))
        self.assertEqual(len(ranked), limit)
        self.assertLessEqual(star_count, math.ceil(limit * MAX_ARTIST_SHARE))
        # Still relevance first: the top pick is the strongest song.
        self.assertTrue(ranked[0].startswith("star"))

    def test_cap_relaxes_when_no_alternatives_exist(self) -> None:
        items = [candidate(f"s{i}", artist="only", playlist_co=1) for i in range(6)]
        ranked = RecommendationRanking.rank_local_candidates(items, limit=6)
        self.assertEqual(len(ranked), 6)

    def test_album_repeats_are_spread_out(self) -> None:
        items = [
            candidate("al-1", artist="a1", album="album", playlist_co=3),
            candidate("al-2", artist="a2", album="album", playlist_co=3),
            candidate("solo", artist="a3", album="other", playlist_co=2),
        ]
        ranked = RecommendationRanking.rank_local_candidates(items, limit=3)
        self.assertEqual(ranked[1], "solo")


class TextNormalizationTests(unittest.TestCase):
    def test_normalizes_case_accents_and_punctuation(self) -> None:
        self.assertEqual(
            RecommendationRanking.normalize_text("  Beyoncé — HALO!! "), "beyonce halo"
        )

    def test_strips_featuring_and_remaster_decorations(self) -> None:
        self.assertEqual(RecommendationRanking.normalize_text("Song (feat. Someone)"), "song")
        self.assertEqual(
            RecommendationRanking.normalize_text("Song - 2011 Remastered Version"),
            "song",
        )

    def test_handles_missing_values(self) -> None:
        self.assertEqual(RecommendationRanking.normalize_text(None), "")
        self.assertEqual(RecommendationRanking.normalize_text(""), "")


class ExternalSuggestionRankingTests(unittest.TestCase):
    def test_drops_invalid_duplicate_and_excluded_suggestions(self) -> None:
        suggestions = [
            ExternalSuggestion(artist_name="Seed Artist", track_name="Seed Song"),
            ExternalSuggestion(artist_name="A", track_name="One"),
            ExternalSuggestion(artist_name="a", track_name="ONE (feat. B)"),
            ExternalSuggestion(artist_name="", track_name="No artist"),
            ExternalSuggestion(artist_name="No title", track_name="  "),
            ExternalSuggestion(artist_name="B", track_name="Two"),
        ]
        ranked = RecommendationRanking.rank_external_suggestions(
            suggestions,
            limit=10,
            exclude_keys={RecommendationRanking.suggestion_key("seed artist", "seed song")},
        )
        self.assertEqual([s.track_name for s in ranked], ["One", "Two"])

    def test_keeps_provider_order_but_diversifies_artists(self) -> None:
        suggestions = [
            ExternalSuggestion(artist_name="Same", track_name=f"Track {i}") for i in range(6)
        ] + [ExternalSuggestion(artist_name="Other", track_name="Different")]
        ranked = RecommendationRanking.rank_external_suggestions(suggestions, limit=4)
        self.assertEqual(ranked[0].track_name, "Track 0")
        self.assertIn("Different", [s.track_name for s in ranked])

    def test_empty_input(self) -> None:
        self.assertEqual(RecommendationRanking.rank_external_suggestions([], 5), [])


if __name__ == "__main__":
    unittest.main()


class PersonalRotationTests(unittest.TestCase):
    def test_personal_repetition_reduces_affinity_score(self) -> None:
        fresh = LocalCandidate(media_id=1, public_id="fresh", shared_artists=1)
        repeated = LocalCandidate(
            media_id=2, public_id="repeat", shared_artists=1, recent_user_plays=20
        )
        self.assertGreater(
            RecommendationRanking.score_candidate(fresh),
            RecommendationRanking.score_candidate(repeated),
        )

    def test_rotation_is_stable_but_varies_between_users_and_periods(self) -> None:
        candidates = [LocalCandidate(media_id=i, public_id=str(i)) for i in range(30)]
        rank = RecommendationRanking.rank_local_candidates
        first = rank(candidates, limit=10, rotation_key="user1:period1")
        self.assertEqual(first, rank(candidates, limit=10, rotation_key="user1:period1"))
        self.assertNotEqual(first, rank(candidates, limit=10, rotation_key="user2:period1"))
        self.assertNotEqual(first, rank(candidates, limit=10, rotation_key="user1:period2"))
