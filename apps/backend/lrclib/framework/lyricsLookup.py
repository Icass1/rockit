"""Bounded LRCLIB lookup: recording identity is required, duration only ranks matches."""

import asyncio
import math
import re
import unicodedata
from typing import cast

import httpx
from pydantic import ValidationError
from unidecode import unidecode

from logger import getLogger
from lrclib.models.api import LyricsResponse
from result import Result, ResultCode

logger = getLogger(__name__)
_PRESENTATION = re.compile(
    r"[\[(]\s*(?:official\s+)?(?:music\s+video|video|audio|lyric\s+video|lyrics|hd|4k)\s*[\])]",
    re.IGNORECASE,
)


def text_form(value: str) -> str:
    """Unicode presentation equivalence for matching/search only; originals are untouched."""
    value = unicodedata.normalize("NFKC", value)
    value = "".join(
        char
        for char in value
        if unicodedata.category(char) != "Cf" and not 0xFE00 <= ord(char) <= 0xFE0F
    )
    value = value.translate(
        str.maketrans(
            {"’": "'", "‘": "'", "ʼ": "'", "`": "'", "–": " - ", "—": " - ", "‐": "-", "‑": "-"}
        )
    )
    return " ".join(value.split())


def normalize(value: str) -> str:
    """Keep accents, non-Latin combining marks and meaningful artist symbols."""
    value = text_form(value=value).casefold().replace("'", "")
    return " ".join(
        "".join(
            char if unicodedata.category(char)[0] in "LNMS" or char in "+#&@!$%=×" else " "
            for char in value
        ).split()
    )


def folded(value: str) -> str:
    """Conservative Latin-only fallback; never romanize another writing system."""
    value = unicodedata.normalize("NFKD", text_form(value=value).casefold())
    chars: list[str] = []
    latin = False
    for char in value:
        if unicodedata.category(char).startswith("M"):
            if not latin:
                chars.append(char)
            continue
        latin = "LATIN" in unicodedata.name(char, "") and char.isalpha()
        translated = unidecode(char) if latin else char
        chars.append(
            translated if latin and translated.isascii() and translated.isalpha() else char
        )
    return normalize(value="".join(chars))


def clean_title(title: str, artist: str, relaxed: bool = False) -> str:
    """Discard presentation, never recording qualifiers, with a matching artist prefix."""
    title = _PRESENTATION.sub("", text_form(value=title)).strip()
    prefix = re.match(r"^(.+?)(?:\s+[-–—]\s+|:\s+)(.+)$", title)
    canonical = folded if relaxed else normalize
    if prefix and canonical(value=prefix[1]) == canonical(value=artist):
        title = prefix[2]
    return title.strip()


def recording_identity(
    title: str, album: str, artist: str, relaxed: bool = False
) -> tuple[str, frozenset[str]]:
    """Read version labels from both title and single/EP name, without artist exceptions."""
    title = clean_title(title=title, artist=artist, relaxed=relaxed)
    canonical = folded if relaxed else normalize
    labels = re.findall(r"[\[(]([^\])]+)[\])]", title)
    base = re.sub(r"[\[(][^\])]+[\])]", "", title).strip()
    parts = re.split(r"\s+[-–—]\s+", base, maxsplit=1)
    if len(parts) == 2:
        base = parts[0]
        labels.append(parts[1])
    normalized_base = canonical(value=base)
    normalized_album = canonical(value=album)
    if normalized_album.startswith(normalized_base + " "):
        suffix = normalized_album[len(normalized_base) :].strip()
        # Release packaging does not identify a different recording.
        suffix = re.sub(r"\b(single|ep)\b", "", suffix).strip()
        if suffix:
            labels.append(suffix)
    elif re.search(
        r"\b(live|remix|acoustic|instrumental|karaoke|session|sessions|alt mix)\b",
        normalized_album,
    ):
        # A live/session album also qualifies a track with an unqualified title.
        labels.append(normalized_album)
    versions = frozenset(canonical(value=label) for label in labels if canonical(value=label))
    return normalized_base, versions


def matches(
    record: LyricsResponse, artist: str, title: str, album: str, relaxed: bool = False
) -> bool:
    """Version gates apply equally to canonical and Latin-folded comparisons."""
    canonical = folded if relaxed else normalize
    return (
        bool(canonical(value=artist))
        and bool(canonical(value=title))
        and canonical(value=record.artistName) == canonical(value=artist)
        and recording_identity(
            title=record.trackName, album=record.albumName, artist=artist, relaxed=relaxed
        )
        == recording_identity(title=title, album=album, artist=artist, relaxed=relaxed)
        and not record.instrumental
        and bool((record.plainLyrics or "").strip() or (record.syncedLyrics or "").strip())
    )


def choose_candidate(
    records: list[LyricsResponse],
    artist: str,
    title: str,
    album: str,
    duration: float,
    allow_relaxed: bool,
) -> LyricsResponse | None:
    """Prefer canonical identity; reject collisions created by removing Latin distinctions."""
    eligible = [
        record
        for record in records
        if matches(record=record, artist=artist, title=title, album=album)
    ]
    if not eligible and allow_relaxed:
        eligible = [
            record
            for record in records
            if matches(record=record, artist=artist, title=title, album=album, relaxed=True)
        ]
        identities = {
            (
                normalize(value=record.artistName),
                recording_identity(
                    title=record.trackName,
                    album=record.albumName,
                    artist=record.artistName,
                ),
            )
            for record in eligible
        }
        if len(identities) > 1:
            logger.warning("Ambiguous Latin-folded LRCLIB identity for %s / %s", artist, title)
            return None
    if not eligible:
        return None
    duration_known = math.isfinite(duration) and duration > 0

    def rank(record: LyricsResponse) -> tuple[bool, bool, bool, float, int]:
        difference = abs(record.duration - duration) if duration_known else 0.0
        return (
            duration_known and difference <= 3,
            bool(album) and normalize(value=record.albumName) == normalize(value=album),
            bool((record.syncedLyrics or "").strip()),
            -difference,
            -record.id,
        )

    return max(eligible, key=rank)


async def lookup_lyrics_async(
    artist_name: str, track_name: str, album_name: str, duration: float
) -> Result[LyricsResponse]:
    """Bounded original, Unicode and Latin fallback queries, followed by identity checks."""
    title = clean_title(title=track_name, artist=artist_name)
    if not normalize(value=title) or not normalize(value=artist_name):
        logger.warning("Cannot look up lyrics without track and artist")
        return Result(code=ResultCode.NOT_FOUND, message="Missing lyrics identity")
    duration_known = math.isfinite(duration) and duration > 0
    exact_plain: LyricsResponse | None = None
    records: list[LyricsResponse] = []
    queries = [
        {"artist_name": artist_name, "track_name": track_name},
        {"artist_name": text_form(value=artist_name), "track_name": title},
        {
            "artist_name": folded(value=artist_name),
            "track_name": folded(
                value=clean_title(title=track_name, artist=artist_name, relaxed=True)
            ),
        },
        # A strict server artist filter can itself miss an accent variant. Compare
        # artists and versions locally instead of trusting a broad search's first hit.
        {
            "track_name": folded(
                value=clean_title(title=track_name, artist=artist_name, relaxed=True)
            )
        },
    ]
    unique_queries: list[dict[str, str]] = []
    seen: set[tuple[tuple[str, str], ...]] = set()
    for query in queries:
        key = tuple(sorted((name, value.lower()) for name, value in query.items()))
        if key not in seen:
            unique_queries.append(query)
            seen.add(key)
    try:
        async with (
            asyncio.timeout(20),
            httpx.AsyncClient(
                timeout=10, headers={"User-Agent": "Rockit (https://github.com/Icass1/rockit)"}
            ) as client,
        ):
            if duration_known:
                response = await client.get(
                    url="https://lrclib.net/api/get",
                    params={
                        "artist_name": artist_name,
                        "track_name": track_name,
                        "album_name": album_name,
                        "duration": str(duration),
                    },
                )
                if response.status_code != 404:
                    response.raise_for_status()
                    record = LyricsResponse.model_validate(response.json())
                    records.append(record)
                    if matches(
                        record=record, artist=artist_name, title=track_name, album=album_name
                    ):
                        if (record.syncedLyrics or "").strip():
                            logger.info(
                                "LRCLIB canonical exact match %s for %s", record.id, track_name
                            )
                            return Result(code=ResultCode.OK, message="OK", result=record)
                        exact_plain = record
            for query in unique_queries:
                response = await client.get(url="https://lrclib.net/api/search", params=query)
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, list):
                    raise ValueError("LRCLIB search response is not a list")
                parsed_count = 0
                for item in cast(list[object], payload)[:100]:
                    try:
                        records.append(LyricsResponse.model_validate(item))
                        parsed_count += 1
                    except ValidationError:
                        logger.warning("Ignoring malformed LRCLIB search entry")
                if payload and not parsed_count:
                    raise ValueError("LRCLIB search contains no valid entries")
                canonical = choose_candidate(
                    records=records,
                    artist=artist_name,
                    title=track_name,
                    album=album_name,
                    duration=duration,
                    allow_relaxed=False,
                )
                if canonical:
                    logger.info("LRCLIB canonical search match %s for %s", canonical.id, track_name)
                    return Result(code=ResultCode.OK, message="OK", result=canonical)
    except (TimeoutError, httpx.HTTPError, ValueError) as exc:
        logger.warning("LRCLIB lookup failed for %s: %s", track_name, exc)
        if exact_plain is not None:
            return Result(
                code=ResultCode.OK, message="Exact plain lyrics available", result=exact_plain
            )
        # Do not accept relaxed identity from an incomplete collision check.
        return Result(code=ResultCode.GENERAL_ERROR, message="LRCLIB temporarily unavailable")
    selected = choose_candidate(
        records=records,
        artist=artist_name,
        title=track_name,
        album=album_name,
        duration=duration,
        allow_relaxed=True,
    )
    if selected:
        logger.info("LRCLIB unambiguous Latin-folded match %s for %s", selected.id, track_name)
        return Result(code=ResultCode.OK, message="OK", result=selected)
    logger.warning("No unambiguous LRCLIB identity match for %s / %s", artist_name, track_name)
    return Result(code=ResultCode.NOT_FOUND, message="No unambiguous matching lyrics found")
