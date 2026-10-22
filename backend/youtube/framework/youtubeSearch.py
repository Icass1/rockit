import asyncio
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any

from yt_dlp import YoutubeDL
from ytmusicapi import YTMusic

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.youtube.framework.youtubeApi import youtube_api, RawYoutubeSearchResult
from backend.youtube.framework.youtubeGate import youtube_gate

logger = getLogger(__name__)

# A match at or above this score is good enough to stop searching.
_GOOD_ENOUGH_SCORE: float = 0.85

# A match below this is rejected outright: downloading the wrong song is worse
# than reporting a failed download.
_MINIMUM_ACCEPTABLE_SCORE: float = 0.45

# Duration difference, in seconds, at which the duration score reaches zero.
_DURATION_TOLERANCE_SECONDS: float = 15.0

_OFFICIAL_CHANNEL_KEYWORDS: tuple[str, ...] = (
    "official",
    "vevo",
    "topic",
)


@dataclass
class YoutubeSongQuery:
    """What we know about the song we are trying to find on YouTube."""

    title: str
    artists: list[str]
    album_title: str = ""
    duration_ms: int = 0
    isrc: str = ""

    def duration_seconds(self) -> float | None:
        """Expected duration in seconds, None when unknown."""

        return self.duration_ms / 1000.0 if self.duration_ms else None


@dataclass
class YoutubeCandidate:
    """A single search hit, normalised across the three search backends."""

    video_id: str
    title: str
    channel_title: str = ""
    album_title: str = ""
    duration_seconds: float | None = None
    is_live: bool = False
    source: str = ""
    score: float = 0.0
    reasons: list[str] = field(default_factory=lambda: [])


def _normalize(value: str) -> str:
    """Lowercase and strip punctuation so titles compare sensibly."""

    value = value.lower()
    value = re.sub(r"[^\w\s]", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def _title_score(candidate_title: str, song_title: str) -> float:
    """How well a video title matches the song title."""

    normalized_candidate: str = _normalize(candidate_title)
    normalized_song: str = _normalize(song_title)

    if not normalized_song:
        return 0.0

    if normalized_song in normalized_candidate:
        return 1.0

    return SequenceMatcher(None, normalized_song, normalized_candidate).ratio()


def _artist_score(channel_title: str, artists: list[str]) -> float:
    """How well a channel name matches any of the song's artists."""

    normalized_channel: str = _normalize(channel_title)
    if not normalized_channel:
        return 0.0

    is_official: bool = any(
        keyword in normalized_channel for keyword in _OFFICIAL_CHANNEL_KEYWORDS
    )

    for artist in artists:
        normalized_artist: str = _normalize(artist)
        if not normalized_artist:
            continue
        if normalized_artist in normalized_channel:
            return 1.0 if is_official else 0.95
        if SequenceMatcher(None, normalized_artist, normalized_channel).ratio() > 0.8:
            return 0.9

    return 0.0


def _duration_score(
    candidate_seconds: float | None, expected_seconds: float | None
) -> float | None:
    """Score the duration match, None when either duration is unknown.

    This is the strongest signal available for rejecting covers, live versions
    and extended edits, and it is the one the YouTube Data API cannot give us
    without a second (quota-charged) request.
    """

    if not candidate_seconds or not expected_seconds:
        return None

    difference: float = abs(candidate_seconds - expected_seconds)
    if difference <= 2.0:
        return 1.0
    if difference >= _DURATION_TOLERANCE_SECONDS:
        return 0.0

    return 1.0 - (difference - 2.0) / (_DURATION_TOLERANCE_SECONDS - 2.0)


def _score_candidate(candidate: YoutubeCandidate, song: YoutubeSongQuery) -> None:
    """Score a candidate in place, recording why it scored the way it did."""

    title_score: float = _title_score(
        candidate_title=candidate.title, song_title=song.title
    )
    artist_score: float = _artist_score(
        channel_title=candidate.channel_title, artists=song.artists
    )
    duration_score: float | None = _duration_score(
        candidate_seconds=candidate.duration_seconds,
        expected_seconds=song.duration_seconds(),
    )

    weights: dict[str, float] = {"title": 0.4, "artist": 0.3, "duration": 0.3}
    scores: dict[str, float] = {"title": title_score, "artist": artist_score}

    if duration_score is None:
        # Redistribute the duration weight over the signals we do have, so
        # backends without duration are not penalised across the board.
        total_weight: float = weights["title"] + weights["artist"]
        weights = {
            "title": weights["title"] / total_weight,
            "artist": weights["artist"] / total_weight,
        }
    else:
        scores["duration"] = duration_score

    total: float = sum(scores[key] * weights[key] for key in scores)

    if candidate.album_title and song.album_title:
        if _normalize(candidate.album_title) == _normalize(song.album_title):
            total = min(1.0, total + 0.1)
            candidate.reasons.append("album_match")

    if candidate.is_live:
        total *= 0.5
        candidate.reasons.append("live_penalty")

    if title_score >= 0.8:
        candidate.reasons.append("title_match")
    if artist_score >= 0.8:
        candidate.reasons.append("artist_match")
    if duration_score is not None and duration_score >= 0.9:
        candidate.reasons.append("duration_match")

    candidate.score = total


def _parse_duration_text(duration: str | None) -> float | None:
    """Parse a "3:45" style duration into seconds."""

    if not duration:
        return None

    parts: list[str] = duration.split(":")
    try:
        numbers: list[int] = [int(part) for part in parts]
    except ValueError:
        return None

    seconds: float = 0.0
    for number in numbers:
        seconds = seconds * 60 + number
    return seconds


class YoutubeSearch:
    """Finds the YouTube video for a song without burning YouTube Data API quota.

    The Data API allows 100 search calls a day on the default quota, which the
    downloader used to exhaust in an afternoon. The two backends tried first
    cost nothing, so the Data API is only reached for songs the others miss.
    """

    _ytmusic: YTMusic | None = None

    @staticmethod
    def _get_ytmusic() -> YTMusic:
        """Return the shared unauthenticated YouTube Music client."""

        if YoutubeSearch._ytmusic is None:
            YoutubeSearch._ytmusic = YTMusic()
        return YoutubeSearch._ytmusic

    @staticmethod
    def build_query(song: YoutubeSongQuery) -> str:
        """Build the text query used against every backend."""

        parts: list[str] = [song.title]
        parts.extend(song.artists)
        if song.album_title:
            parts.append(song.album_title)
        return " ".join(part for part in parts if part)

    @staticmethod
    async def _search_ytmusic_async(
        song: YoutubeSongQuery,
    ) -> AResult[list[YoutubeCandidate]]:
        """Search YouTube Music. Free, unauthenticated, and knows about albums."""

        query: str = YoutubeSearch.build_query(song=song)
        loop: asyncio.AbstractEventLoop = asyncio.get_event_loop()

        try:
            await youtube_gate.pace_async()
            raw: list[dict[str, Any]] = await loop.run_in_executor(
                None,
                lambda: YoutubeSearch._get_ytmusic().search(
                    query, filter="songs", limit=10
                ),
            )
        except Exception as e:
            logger.warning(f"YouTube Music search failed for '{query}': {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message=f"ytmusicapi search failed: {e}"
            )

        candidates: list[YoutubeCandidate] = []
        for item in raw:
            video_id: str | None = item.get("videoId")
            if not video_id:
                continue

            raw_artists: list[dict[str, Any]] = item.get("artists") or []
            artists: list[str] = [str(artist.get("name", "")) for artist in raw_artists]
            album: dict[str, Any] = item.get("album") or {}

            candidates.append(
                YoutubeCandidate(
                    video_id=video_id,
                    title=item.get("title", ""),
                    channel_title=", ".join(name for name in artists if name),
                    album_title=album.get("name", "") or "",
                    duration_seconds=item.get("duration_seconds")
                    or _parse_duration_text(item.get("duration")),
                    source="ytmusic",
                )
            )

        return AResult(code=AResultCode.OK, message="OK", result=candidates)

    @staticmethod
    async def _search_ytdlp_async(
        song: YoutubeSongQuery,
    ) -> AResult[list[YoutubeCandidate]]:
        """Search through yt-dlp's own ytsearch. Also free, but hits youtube.com."""

        query: str = YoutubeSearch.build_query(song=song)
        loop: asyncio.AbstractEventLoop = asyncio.get_event_loop()

        opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": "in_playlist",
            "skip_download": True,
            "socket_timeout": 20,
            "extractor_args": {"youtube": {"player_client": ["android_vr"]}},
        }

        try:
            await youtube_gate.pace_async()
            info: dict[str, Any] | None = await loop.run_in_executor(
                None,
                lambda: YoutubeDL(opts).extract_info(  # type: ignore[arg-type]
                    f"ytsearch10:{query}", download=False
                ),
            )
        except Exception as e:
            logger.warning(f"yt-dlp search failed for '{query}': {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message=f"yt-dlp search failed: {e}"
            )

        entries: list[dict[str, Any]] = (info or {}).get("entries") or []
        candidates: list[YoutubeCandidate] = []
        for entry in entries:
            video_id: str | None = entry.get("id")
            if not video_id:
                continue

            candidates.append(
                YoutubeCandidate(
                    video_id=video_id,
                    title=entry.get("title") or "",
                    channel_title=entry.get("channel") or entry.get("uploader") or "",
                    duration_seconds=entry.get("duration"),
                    is_live=bool(entry.get("is_live")),
                    source="ytdlp",
                )
            )

        return AResult(code=AResultCode.OK, message="OK", result=candidates)

    @staticmethod
    async def _search_data_api_async(
        song: YoutubeSongQuery,
    ) -> AResult[list[YoutubeCandidate]]:
        """Search through the YouTube Data API. Costs 100 quota units per call."""

        query: str = YoutubeSearch.build_query(song=song)

        a_result: AResult[list[RawYoutubeSearchResult]] = (
            await youtube_api.search_videos_async(query=query, max_results=15)
        )
        if a_result.is_not_ok():
            logger.warning(f"YouTube Data API search failed. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        candidates: list[YoutubeCandidate] = []
        for video in a_result.result():
            if not video.video_id:
                continue

            candidates.append(
                YoutubeCandidate(
                    video_id=video.video_id,
                    title=video.title or "",
                    channel_title=video.channel_title or "",
                    is_live=video.live_broadcast_content == "live",
                    source="data_api",
                )
            )

        return AResult(code=AResultCode.OK, message="OK", result=candidates)

    @staticmethod
    def _score_all(candidates: list[YoutubeCandidate], song: YoutubeSongQuery) -> None:
        """Score every candidate in place."""

        for candidate in candidates:
            _score_candidate(candidate=candidate, song=song)
            logger.debug(
                f"[{candidate.source}] {candidate.title} - {candidate.channel_title} "
                f"({candidate.video_id}) score={candidate.score:.2f} "
                f"({', '.join(candidate.reasons) or 'no_match'})"
            )

    @staticmethod
    async def find_best_video_url_async(song: YoutubeSongQuery) -> AResult[str]:
        """Find the single best YouTube URL for a song."""

        a_result: AResult[list[str]] = await YoutubeSearch.find_video_urls_async(
            song=song
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result()[0])

    @staticmethod
    async def find_video_urls_async(
        song: YoutubeSongQuery, limit: int = 3
    ) -> AResult[list[str]]:
        """Find ranked YouTube URLs for a song, cheapest search backend first.

        More than one is returned on purpose. YouTube gates individual videos
        differently: an auto-generated "Art Track" can be undownloadable while
        the artist's own upload of the same song is fine, so the downloader
        needs somewhere to go when every client fails on the first candidate.
        """

        logger.info(
            f"Searching YouTube for '{song.title}' by "
            f"{', '.join(song.artists) or 'unknown artist'}"
        )

        backends = (
            ("YouTube Music", YoutubeSearch._search_ytmusic_async),
            ("yt-dlp", YoutubeSearch._search_ytdlp_async),
            ("YouTube Data API", YoutubeSearch._search_data_api_async),
        )

        seen_video_ids: set[str] = set()
        scored: list[YoutubeCandidate] = []

        for backend_name, backend in backends:
            a_result: AResult[list[YoutubeCandidate]] = await backend(song)
            if a_result.is_not_ok():
                continue

            candidates: list[YoutubeCandidate] = [
                candidate
                for candidate in a_result.result()
                if candidate.video_id not in seen_video_ids
            ]
            if not candidates:
                logger.warning(f"{backend_name} returned no new candidates")
                continue

            YoutubeSearch._score_all(candidates=candidates, song=song)
            seen_video_ids.update(candidate.video_id for candidate in candidates)
            scored.extend(candidates)

            best_score: float = max(candidate.score for candidate in candidates)
            if best_score >= _GOOD_ENOUGH_SCORE:
                logger.info(f"{backend_name} produced a match scoring {best_score:.2f}")
                break

            logger.info(
                f"{backend_name} best match scored {best_score:.2f}, below the "
                f"{_GOOD_ENOUGH_SCORE} threshold. Trying the next backend"
            )

        usable: list[YoutubeCandidate] = sorted(
            (c for c in scored if c.score >= _MINIMUM_ACCEPTABLE_SCORE),
            key=lambda c: c.score,
            reverse=True,
        )[:limit]

        if not usable:
            logger.error(f"No suitable YouTube video found for '{song.title}'")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="No suitable YouTube video found",
            )

        for candidate in usable:
            logger.info(
                f"Candidate [{candidate.source}] {candidate.title} - "
                f"{candidate.channel_title} score={candidate.score:.2f} "
                f"({', '.join(candidate.reasons) or 'no_match'})"
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[
                f"https://www.youtube.com/watch?v={candidate.video_id}"
                for candidate in usable
            ],
        )
