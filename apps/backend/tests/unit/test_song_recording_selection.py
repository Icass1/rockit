"""Song downloads must never silently fall back to a videoclip soundtrack."""

from dataclasses import replace
from typing import cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from requests import Session
from ytmusicapi import YTMusic

from result import ResultCode
from youtube.framework.youtubeGate import youtube_gate
from youtube.framework.youtubeSearch import (
    YoutubeCandidate,
    YoutubeSearch,
    YoutubeSongQuery,
    score_candidate,
)

SONG = YoutubeSongQuery(title="My Song", artists=["The Artist"], duration_ms=180000)
RECORDING = YoutubeCandidate(
    video_id="recording01",
    title="My Song",
    artists=["The Artist"],
    duration_seconds=180,
    catalog_song=True,
    video_type="MUSIC_VIDEO_TYPE_ATV",
)


@pytest.mark.parametrize(
    "candidate,accepted",
    [
        (RECORDING, True),
        (replace(RECORDING, video_type="MUSIC_VIDEO_TYPE_OMV"), False),
        (replace(RECORDING, video_type="MUSIC_VIDEO_TYPE_UGC"), False),
        (replace(RECORDING, catalog_song=False, video_type=None), False),
        (replace(RECORDING, artists=["Another Artist"]), False),
        (replace(RECORDING, artists=["The Artist", "Another Artist"]), False),
        (replace(RECORDING, duration_seconds=196), False),
        (replace(RECORDING, duration_seconds=None), False),
        (replace(RECORDING, title="My Song (Live)"), False),
        (replace(RECORDING, title="My Song (Remix)"), False),
        (replace(RECORDING, title="My Song (Instrumental)"), False),
        (replace(RECORDING, title="My Song (Cover)"), False),
        (replace(RECORDING, title="My Song (Sped Up)"), False),
        (replace(RECORDING, is_live=True), False),
    ],
)
def test_identity_gates_cannot_be_outweighed_by_title_or_album(
    candidate: YoutubeCandidate,
    accepted: bool,
) -> None:
    candidate = replace(candidate)
    score_candidate(candidate=candidate, song=SONG)
    assert (candidate.score >= 0.85) is accepted


def test_requested_live_recording_is_preserved() -> None:
    candidate = replace(RECORDING, title="My Song (Live)")
    score_candidate(candidate=candidate, song=replace(SONG, title="My Song (Live)"))
    assert candidate.score >= 0.85


def client(monkeypatch: pytest.MonkeyPatch, rows: list[dict[str, object]]) -> MagicMock:
    api = MagicMock()
    api.__enter__.return_value = api
    api.search.return_value = rows

    def get_client(session: Session) -> YTMusic:
        return cast(YTMusic, api)

    monkeypatch.setattr(YoutubeSearch, "_get_ytmusic", get_client)
    monkeypatch.setattr(youtube_gate, "pace_async", AsyncMock())
    return api


def row(identity: str, video_type: str = "MUSIC_VIDEO_TYPE_ATV") -> dict[str, object]:
    return {
        "videoId": identity,
        "title": "My Song",
        "artists": [{"name": "The Artist"}],
        "duration_seconds": 180,
        "resultType": "song",
        "videoType": video_type,
    }


async def test_primary_and_all_fallbacks_are_catalogue_recordings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    api = client(
        monkeypatch,
        [row("videoclip01", "MUSIC_VIDEO_TYPE_OMV"), row("recording01"), row("recording02")],
    )
    result = await YoutubeSearch.find_video_urls_async(song=SONG)
    assert result.is_ok(), result.info()
    assert result.result() == [
        "https://music.youtube.com/watch?v=recording01",
        "https://music.youtube.com/watch?v=recording02",
    ]
    api.search.assert_called_once_with(
        "my song The Artist", filter="songs", limit=10, ignore_spelling=True
    )


async def test_only_videoclips_fails_instead_of_using_generic_search(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client(monkeypatch, [row("videoclip01", "MUSIC_VIDEO_TYPE_OMV")])
    result = await YoutubeSearch.find_video_urls_async(song=SONG)
    assert result.code() == ResultCode.NOT_FOUND


async def test_cached_videoclip_is_replaced_before_download(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    api = client(monkeypatch, [row("recording01")])
    api.get_song.return_value = {
        "videoDetails": {
            "videoId": "videoclip01",
            "musicVideoType": "MUSIC_VIDEO_TYPE_OMV",
        }
    }
    result = await YoutubeSearch.find_video_urls_async(
        song=SONG, preferred_url="https://www.youtube.com/watch?v=videoclip01"
    )
    assert result.is_ok(), result.info()
    assert result.result() == ["https://music.youtube.com/watch?v=recording01"]


async def test_clip_duration_is_not_used_as_a_song_reference(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    api = client(monkeypatch, [row("recording01")])
    api.get_song.return_value = {
        "videoDetails": {
            "videoId": "videoclip01",
            "musicVideoType": "MUSIC_VIDEO_TYPE_OMV",
        }
    }
    result = await YoutubeSearch.find_video_urls_async(
        song=replace(SONG, duration_ms=240000),
        preferred_url="https://music.youtube.com/watch?v=videoclip01",
        duration_from_preferred=True,
    )
    assert result.is_ok(), result.info()
    assert "recording01" in result.result()[0]


async def test_isrc_search_still_checks_metadata_then_tries_title(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    api = client(monkeypatch, [])
    api.search.side_effect = [
        [dict(row("wrongartist"), artists=[{"name": "Other"}])],
        [row("recording01")],
    ]
    result = await YoutubeSearch.find_video_urls_async(song=replace(SONG, isrc="US-ABC-24-12345"))
    assert result.is_ok(), result.info()
    assert api.search.call_args_list[0].args[0] == "USABC2412345"
    assert api.search.call_count == 2


async def test_catalogue_outage_is_retryable_not_no_match(monkeypatch: pytest.MonkeyPatch) -> None:
    api = client(monkeypatch, [])
    api.search.side_effect = RuntimeError("offline")
    result = await YoutubeSearch.find_video_urls_async(song=SONG)
    assert result.code() == ResultCode.GENERAL_ERROR


async def test_album_query_miss_retries_identity_without_changing_gates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    api = client(monkeypatch, [])
    api.search.side_effect = [[], [row("recording01")]]
    result = await YoutubeSearch.find_video_urls_async(
        song=replace(SONG, album_title="Collector Edition")
    )
    assert result.is_ok(), result.info()
    assert result.result() == ["https://music.youtube.com/watch?v=recording01"]
    assert [call.args[0] for call in api.search.call_args_list] == [
        "my song The Artist Collector Edition",
        "my song The Artist",
    ]


@pytest.mark.parametrize(
    "change",
    [
        {"videoType": "MUSIC_VIDEO_TYPE_OMV"},
        {"artists": [{"name": "Other Artist"}]},
        {"duration_seconds": 210},
        {"title": "My Song (Live)"},
        {"title": "My Song (Remix)"},
    ],
)
async def test_identity_fallback_cannot_accept_a_different_recording(
    monkeypatch: pytest.MonkeyPatch,
    change: dict[str, object],
) -> None:
    api = client(monkeypatch, [])
    api.search.side_effect = [[], [dict(row("recording01"), **change)]]
    result = await YoutubeSearch.find_video_urls_async(song=replace(SONG, album_title="Edition"))
    assert result.code() == ResultCode.NOT_FOUND


async def test_partial_outage_does_not_report_permanent_no_match(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    api = client(monkeypatch, [])
    api.search.side_effect = [[], RuntimeError("unavailable")]
    result = await YoutubeSearch.find_video_urls_async(song=replace(SONG, album_title="Edition"))
    assert result.code() == ResultCode.GENERAL_ERROR


async def test_rejected_candidates_log_metadata_and_reason(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from youtube.framework import youtubeSearch as search_module

    monkeypatch.setattr(search_module.logger, "propagate", True)
    client(monkeypatch, [dict(row("recording01"), duration_seconds=220)])
    result = await YoutubeSearch.find_video_urls_async(song=SONG)
    assert result.code() == ResultCode.NOT_FOUND
    assert "different_or_unknown_duration" in caplog.text
    assert "recording01" in caplog.text
    assert "duration_ms=180000" in caplog.text
    assert "duration_s=220" in caplog.text
