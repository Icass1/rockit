"""Lyricsfile parsing, preference, and preservation through playback/corrections."""

import json
from unittest.mock import AsyncMock

import pytest

from core.framework.lyricsCorrections import LyricsContext, apply_overlay
from core.models.lyrics import DynamicLyrics, DynamicLyricsData, Lyrics, LyricsWord
from core.models.lyricsCorrection import LyricsCorrectionLine, StoredLyricsCorrection
from core.models.playbackLyricsLine import PlaybackLyricsLine
from lrclib.access.lyricsAccess import LyricsAccess
from lrclib.framework.lrclib import Lrclib
from lrclib.framework.lyricsLookup import choose_candidate
from lrclib.models.api import LyricsResponse
from result import Result, ResultCode
from tests.unit.test_lrclib_lookup import entry, lookup_with_responses


def lyricsfile(**changes: object) -> str:
    document: dict[str, object] = {
        "version": "1.0",
        "plain": "Hello world",
        "lines": [
            {
                "text": "Hello world",
                "start_ms": 1234,
                "end_ms": 3400,
                "words": [
                    {"text": "Hello ", "start_ms": 1234, "end_ms": 1900},
                    {"text": "world", "start_ms": 2100},
                ],
            }
        ],
    }
    document.update(changes)
    return json.dumps(document)


def record(**changes: object) -> LyricsResponse:
    return LyricsResponse.model_validate(entry(lyricsfile=lyricsfile(), **changes))


def test_lyricsfile_precedes_legacy_and_preserves_milliseconds_whitespace_and_ends() -> None:
    result = Lrclib.parse_lyrics(parsed=record())
    assert result.is_ok()
    plain, dynamic = result.result()
    assert plain and plain[0].text == "Hello world"
    assert dynamic and dynamic.offset == 0
    line = dynamic.lines[0]
    assert line.timestamp_s == 1.234 and line.end_timestamp_s == 3.4
    assert line.words[0].timestamp_s == 1.234 and line.words[0].end_timestamp_s == 1.9
    assert line.words[1].end_timestamp_s is None
    assert "".join(word.text for word in line.words) == line.text


@pytest.mark.parametrize(
    "raw",
    [
        "version: '2.0'",
        "version: [broken",
        "version: '1.0'\nversion: '1.0'",
        "version: '1.0'\nlines: &loop [*loop]",
        "x" * 1_000_001,
    ],
)
def test_invalid_files_fall_back_to_lrc(raw: str) -> None:
    source = LyricsResponse.model_validate(entry(lyricsfile=raw, hasWordSync=True))
    result = Lrclib.parse_lyrics(parsed=source)
    assert result.is_ok()
    _, dynamic = result.result()
    assert source.quality == 2
    assert dynamic and dynamic.lines[0].text == "Example line"
    assert not dynamic.lines[0].words


@pytest.mark.parametrize(
    "words",
    [
        [{"text": "Wrong text", "start_ms": 1200}],
        [{"text": "Hello world", "start_ms": -1}],
        [{"text": "Hello world", "start_ms": 1234, "end_ms": 1200}],
        [{"text": "Hello world", "start_ms": 9999}],
        [{"text": "Hello world", "start_ms": 1.5}],
    ],
)
def test_invalid_words_keep_complete_line(words: object) -> None:
    raw = lyricsfile(
        lines=[{"text": "Hello world", "start_ms": 1234, "end_ms": 3400, "words": words}]
    )
    source = LyricsResponse.model_validate(entry(lyricsfile=raw))
    result = Lrclib.parse_lyrics(parsed=source)
    assert result.is_ok()
    _, dynamic = result.result()
    assert source.quality == 2
    assert dynamic and dynamic.lines[0].text == "Hello world"
    assert dynamic.lines[0].words == []


def test_lyricsfile_only_mixed_word_and_line_sync() -> None:
    raw = json.loads(lyricsfile())
    raw["lines"].append({"text": "Next line", "start_ms": 4000})
    source = LyricsResponse.model_validate(
        entry(plainLyrics=None, syncedLyrics=None, lyricsfile=json.dumps(raw))
    )
    result = Lrclib.parse_lyrics(parsed=source)
    assert result.is_ok() and source.quality == 3
    plain, dynamic = result.result()
    assert plain and dynamic
    assert dynamic.lines[0].words and not dynamic.lines[1].words


def test_preference_word_line_plain_none_before_album_or_duration() -> None:
    sources = [
        record(id=4, albumName="Other release", duration=230),
        LyricsResponse.model_validate(entry(id=3)),
        LyricsResponse.model_validate(entry(id=2, syncedLyrics=None)),
        LyricsResponse.model_validate(entry(id=1, plainLyrics=None, syncedLyrics=None)),
    ]
    for expected in (4, 3, 2):
        chosen = choose_candidate(
            records=sources,
            artist="twenty one pilots",
            title="The Contract",
            album="Breach",
            duration=225,
            allow_relaxed=False,
        )
        assert chosen and chosen.id == expected
        sources.pop(0)
    assert (
        choose_candidate(
            records=sources,
            artist="twenty one pilots",
            title="The Contract",
            album="Breach",
            duration=225,
            allow_relaxed=False,
        )
        is None
    )


async def test_exact_line_sync_does_not_hide_word_sync(monkeypatch: pytest.MonkeyPatch) -> None:
    found, requests = await lookup_with_responses(
        monkeypatch=monkeypatch,
        duration=225,
        responses=[(200, entry()), (200, [entry(id=2, lyricsfile=lyricsfile(), hasWordSync=True)])],
    )
    assert found.is_ok() and found.result().id == 2 and len(requests) == 2


async def test_word_sync_can_arrive_in_later_query(monkeypatch: pytest.MonkeyPatch) -> None:
    found, _ = await lookup_with_responses(
        monkeypatch=monkeypatch,
        duration=225,
        responses=[(200, entry()), (200, [entry()]), (200, [entry(id=2, lyricsfile=lyricsfile())])],
    )
    assert found.is_ok() and found.result().id == 2


async def test_search_outage_keeps_line_sync(monkeypatch: pytest.MonkeyPatch) -> None:
    found, _ = await lookup_with_responses(
        monkeypatch=monkeypatch, duration=225, responses=[(200, entry()), (503, {})]
    )
    assert found.is_ok() and found.result().quality == 2


async def test_cached_line_lyrics_upgrade_once_without_losing_offset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from typing import cast

    from sqlalchemy.ext.asyncio import AsyncSession

    cached = (
        "lyrics-id",
        [Lyrics(text="Original")],
        DynamicLyricsData(lines=[DynamicLyrics(text="Original", timestamp_s=1)], offset=2),
    )
    upgraded = (
        "lyrics-id",
        cached[1],
        DynamicLyricsData(
            lines=[
                DynamicLyrics(
                    text="Hello world",
                    timestamp_s=1.234,
                    words=[LyricsWord(text="Hello world", timestamp_s=1.234)],
                )
            ],
            offset=2,
        ),
    )
    read = AsyncMock(
        side_effect=[
            Result(code=ResultCode.OK, message="OK", result={1: cached}),
            Result(code=ResultCode.OK, message="OK", result={1: upgraded}),
            Result(code=ResultCode.OK, message="OK", result={1: upgraded}),
        ]
    )
    fetch = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result={1: upgraded}))
    monkeypatch.setattr(LyricsAccess, "get_lyrics_by_media_ids_async", read)
    monkeypatch.setattr(Lrclib, "_fetch_and_save_lyrics_batch_async", fetch)
    session = cast(AsyncSession, object())
    first = await Lrclib.get_lyrics_by_media_ids_async(session=session, media_ids=[1])
    second = await Lrclib.get_lyrics_by_media_ids_async(session=session, media_ids=[1])
    assert first.is_ok() and second.is_ok() and first.result()[1][2] == upgraded[2]
    fetch.assert_awaited_once_with(session=session, media_ids=[1], preserve_plain=True)


@pytest.mark.parametrize("line_sync", [False, True])
@pytest.mark.parametrize(
    "fetch_code", [ResultCode.OK, ResultCode.NOT_FOUND, ResultCode.GENERAL_ERROR]
)
async def test_cached_lyrics_without_words_retry_every_request(
    monkeypatch: pytest.MonkeyPatch, line_sync: bool, fetch_code: int
) -> None:
    from typing import cast

    from sqlalchemy.ext.asyncio import AsyncSession

    cached = {
        1: (
            "lyrics-id",
            [Lyrics(text="Original")],
            DynamicLyricsData(lines=[DynamicLyrics(text="Original", timestamp_s=1)], offset=2)
            if line_sync
            else None,
        )
    }
    read = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=cached))
    fetch = AsyncMock(return_value=Result(code=fetch_code, message="No word upgrade", result={}))
    monkeypatch.setattr(LyricsAccess, "get_lyrics_by_media_ids_async", read)
    monkeypatch.setattr(Lrclib, "_fetch_and_save_lyrics_batch_async", fetch)
    session = cast(AsyncSession, object())

    for _ in range(2):
        result = await Lrclib.get_lyrics_by_media_ids_async(session=session, media_ids=[1])
        assert result.is_ok() and result.result() == cached

    assert fetch.await_count == 2
    for attempt in fetch.await_args_list:
        assert attempt.kwargs == dict(session=session, media_ids=[1], preserve_plain=True)


def test_offset_overlay_preserves_word_sync_but_text_edits_remove_it() -> None:
    source = PlaybackLyricsLine(
        text="Hello", timestamp_s=1, words=[LyricsWord(text="Hello", timestamp_s=1)]
    )
    for text, preserves_words in [("Hello", True), ("Changed", False)]:
        context = LyricsContext(
            provider="LRCLIB",
            public_id="id",
            lines=[source],
            offset=0,
            source_hash="hash",
            audio_identity="audio",
            revision=None,
        )
        proposal = StoredLyricsCorrection(
            provider="LRCLIB",
            revision="0" * 64,
            offset=2,
            lines=[LyricsCorrectionLine(text=text, timestamp_s=1)],
            sourceHash="hash",
            audioIdentity="audio",
        )
        applied = apply_overlay(
            context=context, proposals=[("approved", proposal.model_dump_json())]
        )
        assert applied.offset == 2
        assert bool(applied.lines[0].words) == preserves_words


@pytest.mark.parametrize("include_file", [False, True])
async def test_dump_import_preserves_words_and_supports_legacy_schema(
    monkeypatch: pytest.MonkeyPatch,
    include_file: bool,
) -> None:
    from typing import cast

    import aiosqlite
    from sqlalchemy.ext.asyncio import AsyncSession

    from lrclib.access.lyricsDumpAccess import LyricsDumpAccess
    from lrclib.framework.importLrcLib import (
        TrackInfo,
        _process_track_async,  # pyright: ignore[reportPrivateUsage]
    )

    async with aiosqlite.connect(":memory:") as db:
        file_column = ", lyricsfile text" if include_file else ""
        await db.executescript(
            "CREATE TABLE tracks (id integer, name_lower text, artist_name_lower text, "
            "album_name_lower text, duration real, last_lyrics_id integer);"
            f"CREATE TABLE lyrics (id integer, plain_lyrics text, synced_lyrics text{file_column});"
            "INSERT INTO tracks VALUES (1, 'song', 'artist', 'album', 10, 1);"
        )
        values = [1, "Hello world", "[00:01.23]Hello world"]
        if include_file:
            values.append(lyricsfile())
        await db.execute(f"INSERT INTO lyrics VALUES ({','.join('?' for _ in values)})", values)
        support = await LyricsDumpAccess.has_lyricsfile_async(db=db)
        assert support.is_ok() and support.result() == include_file
        save = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result="lyrics"))
        monkeypatch.setattr(LyricsAccess, "save_lyrics_async", save)
        imported = await _process_track_async(
            db=db,
            session=cast(AsyncSession, object()),
            track=TrackInfo(
                id=1, name="Song", artist_name="Artist", album_name="Album", duration_ms=10000
            ),
            include_lyricsfile=include_file,
        )
        assert imported.is_ok()
        saved = save.call_args.kwargs["dynamic_lyrics"]
        assert bool(saved[0].words) == include_file
        assert saved[0].timestamp_s == (1.234 if include_file else 1.23)


def test_empty_or_malformed_timing_does_not_outrank_usable_plain_lyrics() -> None:
    empty = LyricsResponse.model_validate(
        entry(
            plainLyrics="  ",
            syncedLyrics="[00:00.00]  ",
            lyricsfile=lyricsfile(plain="  ", lines=[{"text": " ", "start_ms": 0}]),
        )
    )
    malformed = LyricsResponse.model_validate(
        entry(plainLyrics="Plain text", syncedLyrics="Not LRC")
    )
    assert empty.quality == 0
    assert malformed.quality == 1
