"""LRCLIB identity matching and HTTP fallback regressions; no external services."""

import httpx
import pytest

from lrclib.framework.lyricsLookup import lookup_lyrics_async
from lrclib.models.api import LyricsResponse
from result import Result, ResultCode


def entry(**changes: object) -> dict[str, object]:
    data: dict[str, object] = {
        "id": 1,
        "name": "The Contract",
        "trackName": "The Contract",
        "artistName": "twenty one pilots",
        "albumName": "Breach",
        "duration": 225,
        "instrumental": False,
        "plainLyrics": "Example line",
        "syncedLyrics": "[00:12] Example line",
    }
    data.update(changes)
    return data


async def lookup_with_responses(
    monkeypatch: pytest.MonkeyPatch,
    responses: list[tuple[int, object]],
    title: str = "The Contract",
    duration: float = 265,
) -> tuple[Result[LyricsResponse], list[httpx.Request]]:
    requests: list[httpx.Request] = []

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        status, payload = responses.pop(0)
        return httpx.Response(status_code=status, json=payload)

    client_type = httpx.AsyncClient

    def make_client(timeout: float, headers: dict[str, str]) -> httpx.AsyncClient:
        return client_type(transport=httpx.MockTransport(handle), timeout=timeout, headers=headers)

    monkeypatch.setattr("lrclib.framework.lyricsLookup.httpx.AsyncClient", make_client)
    result = await lookup_lyrics_async(
        artist_name="twenty one pilots", track_name=title, album_name="Breach", duration=duration
    )
    return result, requests


@pytest.mark.asyncio
async def test_missing_optional_lyricsfile_does_not_break_exact_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, requests = await lookup_with_responses(
        monkeypatch=monkeypatch, responses=[(200, entry())], duration=225
    )
    assert result.is_ok()
    assert result.result().id == 1
    assert len(requests) == 1


@pytest.mark.asyncio
async def test_video_duration_does_not_prevent_finding_studio_lyrics(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, requests = await lookup_with_responses(
        monkeypatch=monkeypatch, responses=[(404, {}), (200, [entry()])]
    )
    assert result.is_ok()
    assert result.result().duration == 225
    assert requests[1].url.path == "/api/search"
    assert set(requests[1].url.params) == {"track_name", "artist_name"}


@pytest.mark.asyncio
async def test_search_rejects_wrong_artist_version_and_instrumental(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    wrong = [
        entry(artistName="cover artist"),
        entry(trackName="The Contract (Live)"),
        entry(trackName="The Contract (Remix)"),
        entry(instrumental=True),
    ]
    result, _ = await lookup_with_responses(
        monkeypatch=monkeypatch, responses=[(404, {}), (200, wrong)]
    )
    assert result.is_not_ok()
    assert result.code_str() == "NOT_FOUND"


@pytest.mark.asyncio
async def test_requested_live_version_is_retained(monkeypatch: pytest.MonkeyPatch) -> None:
    result, _ = await lookup_with_responses(
        monkeypatch=monkeypatch,
        title="The Contract (Live)",
        responses=[(404, {}), (200, [entry(), entry(id=2, trackName="The Contract (Live)")])],
    )
    assert result.is_ok()
    assert result.result().id == 2


@pytest.mark.asyncio
async def test_presentation_labels_and_artist_prefix_get_cleaned_retry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, requests = await lookup_with_responses(
        monkeypatch=monkeypatch,
        title="twenty one pilots - The Contract (Official Video)",
        responses=[(404, {}), (200, []), (200, [entry()])],
    )
    assert result.is_ok()
    assert requests[-1].url.params["track_name"] == "The Contract"
    assert len(requests) == 3


@pytest.mark.asyncio
async def test_exact_result_is_not_trusted_without_identity_check(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, _ = await lookup_with_responses(
        monkeypatch=monkeypatch,
        responses=[(200, entry(artistName="someone else")), (200, [entry(id=2)])],
    )
    assert result.is_ok()
    assert result.result().id == 2


@pytest.mark.asyncio
async def test_duration_then_album_rank_compatible_entries(monkeypatch: pytest.MonkeyPatch) -> None:
    result, _ = await lookup_with_responses(
        monkeypatch=monkeypatch,
        duration=225,
        responses=[
            (404, {}),
            (200, [entry(id=2, duration=265), entry(id=3, albumName="Single"), entry(id=4)]),
        ],
    )
    assert result.is_ok()
    assert result.result().id == 4


@pytest.mark.asyncio
async def test_missing_duration_skips_exact_but_can_find_lyrics(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, requests = await lookup_with_responses(
        monkeypatch=monkeypatch, duration=0, responses=[(200, [entry()])]
    )
    assert result.is_ok()
    assert len(requests) == 1
    assert requests[0].url.path == "/api/search"


@pytest.mark.asyncio
@pytest.mark.parametrize("status,payload", [(503, {}), (200, {}), (200, "invalid")])
async def test_api_failures_remain_errors_not_missing_lyrics(
    monkeypatch: pytest.MonkeyPatch, status: int, payload: object
) -> None:
    result, _ = await lookup_with_responses(monkeypatch=monkeypatch, responses=[(status, payload)])
    assert result.is_not_ok()
    assert result.code_str() == "GENERAL_ERROR"


def test_response_accepts_standard_api_fields_without_lyricsfile() -> None:
    assert LyricsResponse.model_validate(entry()).lyricsfile is None


@pytest.mark.asyncio
@pytest.mark.parametrize("duration,has_synced", [(225, True), (265, False), (0, False)])
async def test_synced_only_response_exposes_plain_text_without_rescaling(
    monkeypatch: pytest.MonkeyPatch,
    duration: float,
    has_synced: bool,
) -> None:
    from lrclib.framework.lrclib import Lrclib

    async def fake_lookup(
        artist_name: str, track_name: str, album_name: str, duration: float
    ) -> Result[LyricsResponse]:
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=LyricsResponse.model_validate(entry(plainLyrics=None)),
        )

    monkeypatch.setattr("lrclib.framework.lrclib.lookup_lyrics_async", fake_lookup)
    result = await Lrclib.fetch_lyrics_async(
        artist_name="twenty one pilots",
        track_name="The Contract",
        album_name="Breach",
        duration=duration,
    )
    assert result.is_ok()
    plain, synced = result.result()
    assert plain is not None and plain[0].text == "Example line"
    if has_synced:
        assert synced is not None and synced.lines[0].timestamp_s == 12
        assert synced.offset == 0
    else:
        assert synced is None


@pytest.mark.parametrize("tag,expected", [("[01:02]", 62), ("[01:02.34]", 62.34)])
def test_lrc_integer_and_decimal_timestamps(tag: str, expected: float) -> None:
    from lrclib.framework.lrclib import Lrclib

    result = Lrclib.parse_timestamp(line=tag + " Example line")
    assert result.is_ok()
    assert result.result() == (expected, "Example line")


@pytest.mark.parametrize(
    "requested_title,requested_album,candidate_title,candidate_album,accepted",
    [
        ("The Hype", "Trench", "The Hype", "The Hype", True),
        ("The Hype", "Trench", "The Hype", "The Hype (Berlin)", False),
        ("The Hype", "Trench", "The Hype", "The Hype (Alt Mix)", False),
        ("The Hype", "Trench", "The Hype (Berlin)", "The Hype", False),
        ("The Hype", "Trench", "The Hype - Alt Mix", "The Hype", False),
        ("The Hype (Berlin)", "The Hype", "The Hype", "The Hype (Berlin)", True),
        ("The Hype - Berlin", "The Hype", "The Hype (Berlin)", "The Hype", True),
        ("The Hype (Berlin)", "The Hype", "The Hype", "The Hype", False),
        ("The Hype (Alt Mix)", "The Hype", "The Hype", "The Hype (Berlin)", False),
        ("The Hype", "Trench", "The Hype", "Live at a Festival", False),
        ("The Hype", "The Hype - Single", "The Hype", "The Hype", True),
        ("Another Song", "Album", "Another Song", "Another Song (Alternate Take)", False),
    ],
)
def test_versions_in_titles_and_album_names_are_identity_gates(
    requested_title: str,
    requested_album: str,
    candidate_title: str,
    candidate_album: str,
    accepted: bool,
) -> None:
    from lrclib.framework.lyricsLookup import matches

    record = LyricsResponse.model_validate(
        entry(trackName=candidate_title, albumName=candidate_album)
    )
    assert (
        matches(
            record=record, artist="twenty one pilots", title=requested_title, album=requested_album
        )
        is accepted
    )


@pytest.mark.asyncio
async def test_exact_and_search_paths_reject_version_hidden_in_album(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, _ = await lookup_with_responses(
        monkeypatch=monkeypatch,
        responses=[
            (200, entry(albumName="The Contract (Alt Mix)")),
            (200, [entry(albumName="The Contract (Alt Mix)")]),
        ],
    )
    assert result.is_not_ok()
    assert result.code_str() == "NOT_FOUND"
