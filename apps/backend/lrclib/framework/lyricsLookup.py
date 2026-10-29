"""Bounded LRCLIB lookup: recording identity is required, duration only ranks matches."""

import math
import re
import unicodedata
from typing import cast

import httpx
from pydantic import ValidationError

from logger import getLogger
from lrclib.models.api import LyricsResponse
from result import Result, ResultCode

logger = getLogger(__name__)
_PRESENTATION = re.compile(
    r"[\[(]\s*(?:official\s+)?(?:music\s+video|video|audio|lyric\s+video|lyrics|hd|4k)\s*[\])]",
    re.IGNORECASE,
)


def normalize(value: str) -> str:
    """Normalize typography without discarding recording/version qualifiers."""
    value = unicodedata.normalize("NFKC", value).casefold()
    return " ".join(re.sub(r"[^\w\s]", " ", value).split())


def clean_title(title: str, artist: str) -> str:
    """Remove presentation labels and an exact artist prefix, retaining musical versions."""
    title = _PRESENTATION.sub("", title).strip()
    prefix = re.match(r"^(.+?)\s+[-–—]\s+(.+)$", title)
    if prefix and normalize(value=prefix[1]) == normalize(value=artist):
        title = prefix[2]
    return title.strip()


def matches(record: LyricsResponse, artist: str, title: str) -> bool:
    """Never select a homonymous song, cover or alternate musical version by duration."""
    return (
        bool(normalize(value=artist))
        and bool(normalize(value=title))
        and normalize(value=record.artistName) == normalize(value=artist)
        and normalize(value=clean_title(title=record.trackName, artist=artist))
        == normalize(value=clean_title(title=title, artist=artist))
        and not record.instrumental
        and bool((record.plainLyrics or "").strip() or (record.syncedLyrics or "").strip())
    )


async def lookup_lyrics_async(
    artist_name: str, track_name: str, album_name: str, duration: float
) -> Result[LyricsResponse]:
    """Try exact lookup, then search without album/duration constraints in one session."""
    title = clean_title(title=track_name, artist=artist_name)
    if not normalize(value=title) or not normalize(value=artist_name):
        logger.warning("Cannot look up lyrics without track and artist")
        return Result(code=ResultCode.NOT_FOUND, message="Missing lyrics identity")
    duration_known = math.isfinite(duration) and duration > 0
    params = {
        "artist_name": artist_name,
        "track_name": track_name,
        "album_name": album_name,
        "duration": str(duration),
    }
    try:
        async with httpx.AsyncClient(
            timeout=10, headers={"User-Agent": "Rockit (https://github.com/Icass1/rockit)"}
        ) as client:
            if duration_known:
                response = await client.get(url="https://lrclib.net/api/get", params=params)
                if response.status_code != 404:
                    response.raise_for_status()
                    record = LyricsResponse.model_validate(response.json())
                    if matches(record=record, artist=artist_name, title=track_name):
                        logger.info("LRCLIB exact match %s for %s", record.id, track_name)
                        return Result(code=ResultCode.OK, message="OK", result=record)
            # Search ignores duration and album. Retry with presentation labels removed only
            # when the original text differs; this keeps network work bounded to three calls.
            for query_title in dict.fromkeys([track_name, title]):
                response = await client.get(
                    url="https://lrclib.net/api/search",
                    params={"artist_name": artist_name, "track_name": query_title},
                )
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, list):
                    raise ValueError("LRCLIB search response is not a list")
                candidates: list[LyricsResponse] = []
                for item in cast(list[object], payload)[:100]:
                    try:
                        record = LyricsResponse.model_validate(item)
                    except ValidationError:
                        logger.warning("Ignoring malformed LRCLIB search entry")
                        continue
                    if matches(record=record, artist=artist_name, title=track_name):
                        candidates.append(record)
                if candidates:

                    def rank(record: LyricsResponse) -> tuple[bool, bool, bool, float, int]:
                        difference = abs(record.duration - duration) if duration_known else 0.0
                        return (
                            duration_known and difference <= 3,
                            bool(album_name)
                            and normalize(value=record.albumName) == normalize(value=album_name),
                            bool((record.syncedLyrics or "").strip()),
                            -difference,
                            -record.id,
                        )

                    selected = max(candidates, key=rank)
                    logger.info(
                        "LRCLIB search match %s for %s (requested %.2fs, found %.2fs)",
                        selected.id,
                        track_name,
                        duration,
                        selected.duration,
                    )
                    return Result(code=ResultCode.OK, message="OK", result=selected)
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("LRCLIB lookup failed for %s: %s", track_name, exc)
        return Result(code=ResultCode.GENERAL_ERROR, message="LRCLIB temporarily unavailable")
    logger.warning("No LRCLIB identity match for %s / %s", artist_name, track_name)
    return Result(code=ResultCode.NOT_FOUND, message="No matching lyrics found")
