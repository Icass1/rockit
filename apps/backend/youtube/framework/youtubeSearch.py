"""Select catalogue recordings for song downloads, never music-video soundtracks."""

import asyncio
import re
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass, field, replace
from difflib import SequenceMatcher
from functools import partial
from typing import Any, cast
from urllib.parse import parse_qs, urlparse

from requests import Response, Session
from ytmusicapi import YTMusic

from logger import getLogger
from result import Result, ResultCode
from youtube.framework.youtubeGate import youtube_gate

logger = getLogger(__name__)
_MINIMUM_ACCEPTABLE_SCORE = 0.85
_ART_TRACK = "MUSIC_VIDEO_TYPE_ATV"
_VERSION_MARKERS = re.compile(
    r"\b(live|remix|cover|karaoke|instrumental|acoustic|nightcore|extended|"
    r"sped up|slowed|radio edit|remaster(?:ed)?)\b"
)
_PRESENTATION_LABEL = re.compile(
    r"[\[(]\s*(?:official\s+)?(?:music\s+video|video|audio|lyric\s+video|lyrics)\s*[\])]",
    re.IGNORECASE,
)


@dataclass
class YoutubeSongQuery:
    """Metadata of the requested recording; duration is not inferred from a clip."""

    title: str
    artists: list[str]
    album_title: str = ""
    duration_ms: int = 0
    isrc: str = ""

    def duration_seconds(self) -> float | None:
        return self.duration_ms / 1000.0 if self.duration_ms > 0 else None


@dataclass
class YoutubeCandidate:
    """A catalogue song with explicit source classification and artist credits."""

    video_id: str
    title: str
    channel_title: str = ""
    album_title: str = ""
    duration_seconds: float | None = None
    is_live: bool = False
    source: str = "ytmusic"
    score: float = 0.0
    reasons: list[str] = field(default_factory=list[str])
    catalog_song: bool = False
    video_type: str | None = None
    artists: list[str] = field(default_factory=list[str])


def _normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    return " ".join(re.sub(r"[^\w\s]", " ", value).split())


def _clean_title(title: str, artists: list[str]) -> str:
    """Discard presentation labels, retaining musical versions and edit names."""
    title = _PRESENTATION_LABEL.sub("", title).strip()
    title = re.sub(
        r"[\[(]\s*(?:feat\.?|ft\.?|featuring)\s+[^\])]+[\])]", "", title, flags=re.IGNORECASE
    )
    for artist in artists:
        prefix = re.match(r"^(.+?)\s+[-–—]\s+(.+)$", title)
        if prefix and _normalize(prefix[1]) == _normalize(artist):
            title = prefix[2]
            break
    return _normalize(title)


def score_candidate(candidate: YoutubeCandidate, song: YoutubeSongQuery) -> None:
    """Identity, version and timing are gates, not compensatable popularity bonuses."""
    candidate.score = 0
    candidate.reasons.clear()
    if not candidate.catalog_song or candidate.video_type not in (None, _ART_TRACK):
        candidate.reasons.append("not_catalog_audio")
        return
    if candidate.is_live:
        candidate.reasons.append("live_broadcast")
        return
    title = _clean_title(title=candidate.title, artists=song.artists)
    expected_title = _clean_title(title=song.title, artists=song.artists)
    if not title or not expected_title:
        candidate.reasons.append("missing_title")
        return
    if set(_VERSION_MARKERS.findall(title)) != set(_VERSION_MARKERS.findall(expected_title)):
        candidate.reasons.append("different_version")
        return
    title_score = SequenceMatcher(None, title, expected_title).ratio()
    if title_score < 0.90:
        candidate.reasons.append("different_title")
        return
    credits = candidate.artists or [candidate.channel_title]
    expected_artists = {_normalize(artist) for artist in song.artists if artist.strip()}
    normalized_credits = [
        _normalize(re.sub(r"\s*-\s*Topic$", "", artist, flags=re.IGNORECASE)) for artist in credits
    ]
    if not expected_artists or expected_artists != set(normalized_credits):
        candidate.reasons.append("different_artist")
        return
    expected_duration = song.duration_seconds()
    duration_score = 1.0
    if expected_duration is not None:
        duration = candidate.duration_seconds
        tolerance = min(6.0, max(3.0, expected_duration * 0.015))
        if duration is None or abs(duration - expected_duration) > tolerance:
            candidate.reasons.append("different_or_unknown_duration")
            return
        duration_score = 1 - abs(duration - expected_duration) / (tolerance * 2)
    candidate.score = title_score * 0.6 + 0.3 + duration_score * 0.1
    candidate.reasons.extend(["catalog_audio", "title_match", "artist_match"])
    if expected_duration is not None:
        candidate.reasons.append("duration_match")
    if song.album_title and _normalize(candidate.album_title) == _normalize(song.album_title):
        candidate.score = min(1.0, candidate.score + 0.05)
        candidate.reasons.append("album_match")


def _parse_duration_text(duration: str | None) -> float | None:
    if not duration:
        return None
    try:
        seconds = 0
        for part in duration.split(":"):
            seconds = seconds * 60 + int(part)
        return float(seconds)
    except ValueError:
        return None


def _video_id(url: str) -> str | None:
    parsed = urlparse(url)
    if parsed.hostname == "youtu.be":
        identity = parsed.path.strip("/")
    elif parsed.hostname in ("youtube.com", "www.youtube.com", "music.youtube.com"):
        identity = parse_qs(parsed.query).get("v", [""])[0]
    else:
        return None
    return identity if re.fullmatch(r"[A-Za-z0-9_-]{11}", identity) else None


class YoutubeSearch:
    """Bounded, paced metadata lookup; yt-dlp only transfers the selected recording."""

    @staticmethod
    def _get_ytmusic(session: Session) -> YTMusic:
        # Independent sessions avoid sharing a mutable requests.Session across workers.
        # ytmusicapi documents this requests-session timeout recipe. partial
        # preserves keyword calls while its inferred positional signature shifts.
        session.request = cast(Callable[..., Response], partial(session.request, timeout=10))
        return YTMusic(requests_session=session)

    @staticmethod
    def _catalog_search(query: str) -> list[dict[str, Any]]:
        with Session() as session:
            client = YoutubeSearch._get_ytmusic(session=session)
            return client.search(query, filter="songs", limit=10, ignore_spelling=True)

    @staticmethod
    def _catalog_song(identity: str) -> dict[str, Any]:
        with Session() as session:
            client = YoutubeSearch._get_ytmusic(session=session)
            return client.get_song(videoId=identity)

    @staticmethod
    def build_query(song: YoutubeSongQuery) -> str:
        title = _clean_title(title=song.title, artists=song.artists)
        return " ".join([title, *song.artists, song.album_title]).strip()

    @staticmethod
    async def _search_ytmusic_async(song: YoutubeSongQuery) -> Result[list[YoutubeCandidate]]:
        queries = [YoutubeSearch.build_query(song=song)]
        isrc = song.isrc.replace("-", "").upper()
        if re.fullmatch(r"[A-Z]{2}[A-Z0-9]{3}[0-9]{7}", isrc):
            queries.insert(0, isrc)
        candidates: dict[str, YoutubeCandidate] = {}
        failures = 0
        for query in queries:
            try:
                await youtube_gate.pace_async()
                raw = await asyncio.to_thread(YoutubeSearch._catalog_search, query=query)
            except Exception:
                failures += 1
                logger.warning("YouTube Music catalogue lookup failed", exc_info=True)
                continue
            for item in raw[:10]:
                identity = item.get("videoId")
                if not isinstance(identity, str) or not re.fullmatch(
                    r"[A-Za-z0-9_-]{11}", identity
                ):
                    continue
                raw_artists: list[dict[str, Any]] = item.get("artists") or []
                artists = [str(artist["name"]) for artist in raw_artists if artist.get("name")]
                album: dict[str, Any] = item.get("album") or {}
                candidate = YoutubeCandidate(
                    video_id=identity,
                    title=item.get("title") or "",
                    artists=artists,
                    album_title=album.get("name") or "",
                    duration_seconds=item.get("duration_seconds")
                    or _parse_duration_text(item.get("duration")),
                    catalog_song=item.get("resultType") == "song",
                    video_type=item.get("videoType"),
                    is_live=bool(item.get("isLive")),
                )
                score_candidate(candidate=candidate, song=song)
                candidates[identity] = candidate
            if any(
                candidate.score >= _MINIMUM_ACCEPTABLE_SCORE for candidate in candidates.values()
            ):
                break
        if failures == len(queries):
            logger.warning("All catalogue searches unavailable for %s", song.title)
            return Result(
                code=ResultCode.GENERAL_ERROR, message="Music catalogue temporarily unavailable"
            )
        return Result(code=ResultCode.OK, message="OK", result=list(candidates.values()))

    @staticmethod
    async def find_best_video_url_async(song: YoutubeSongQuery) -> Result[str]:
        result = await YoutubeSearch.find_video_urls_async(song=song)
        if result.is_not_ok():
            return Result(code=result.code(), message=result.message())
        return Result(code=ResultCode.OK, message="OK", result=result.result()[0])

    @staticmethod
    async def find_video_urls_async(
        song: YoutubeSongQuery,
        limit: int = 3,
        preferred_url: str | None = None,
        duration_from_preferred: bool = False,
    ) -> Result[list[str]]:
        """Return only matched catalogue songs, including every fallback.

        A cached/direct URL is never trusted solely because it was previously saved.
        Metadata inspection may retain a proven art track, never an OMV/UGC upload.
        The duration of an explicitly identified clip is not a recording reference.
        """
        preferred: YoutubeCandidate | None = None
        identity = _video_id(url=preferred_url) if preferred_url else None
        if identity:
            try:
                await youtube_gate.pace_async()
                info = await asyncio.to_thread(YoutubeSearch._catalog_song, identity=identity)
                details: dict[str, Any] = info.get("videoDetails") or {}
                video_type: str | None = details.get("musicVideoType")
                if details.get("videoId") == identity:
                    if duration_from_preferred and video_type in (
                        "MUSIC_VIDEO_TYPE_OMV",
                        "MUSIC_VIDEO_TYPE_UGC",
                    ):
                        song = replace(song, duration_ms=0)
                    if video_type == _ART_TRACK:
                        length: str | int | None = details.get("lengthSeconds")
                        preferred = YoutubeCandidate(
                            video_id=identity,
                            title=details.get("title") or "",
                            channel_title=details.get("author") or "",
                            duration_seconds=float(length) if length else None,
                            catalog_song=True,
                            video_type=video_type,
                            is_live=bool(details.get("isLiveContent")),
                        )
                        score_candidate(candidate=preferred, song=song)
            except Exception:
                logger.warning(
                    "Could not verify stored song URL; searching catalogue", exc_info=True
                )
        result = await YoutubeSearch._search_ytmusic_async(song=song)
        candidates: dict[str, YoutubeCandidate] = {}
        if preferred and preferred.score >= _MINIMUM_ACCEPTABLE_SCORE:
            candidates[preferred.video_id] = preferred
        if result.is_ok():
            for candidate in result.result():
                if candidate.score >= _MINIMUM_ACCEPTABLE_SCORE:
                    candidates[candidate.video_id] = candidate
        elif not candidates:
            return Result(code=result.code(), message=result.message())
        usable = sorted(candidates.values(), key=lambda candidate: candidate.score, reverse=True)[
            : max(1, min(limit, 3))
        ]
        if not usable:
            logger.warning(
                "No matching catalogue recording for %s; refusing video fallback", song.title
            )
            return Result(
                code=ResultCode.NOT_FOUND, message="No matching catalogue recording found"
            )
        for candidate in usable:
            logger.info(
                "Song source %s: %s (%s), score %.2f",
                candidate.video_id,
                candidate.title,
                ", ".join(candidate.reasons),
                candidate.score,
            )
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=[
                f"https://music.youtube.com/watch?v={candidate.video_id}" for candidate in usable
            ],
        )
