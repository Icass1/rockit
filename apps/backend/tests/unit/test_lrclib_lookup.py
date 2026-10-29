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
    artist: str = "twenty one pilots",
    album: str = "Breach",
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
        artist_name=artist, track_name=title, album_name=album, duration=duration
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
        monkeypatch=monkeypatch, responses=[(404, {}), (200, wrong), (200, wrong)]
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
@pytest.mark.parametrize("duration,has_synced", [(225, True), (265, True), (0, True)])
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
            (200, []),
        ],
    )
    assert result.is_not_ok()
    assert result.code_str() == "NOT_FOUND"


@pytest.mark.asyncio
async def test_plain_exact_result_does_not_hide_matching_synced_entry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, requests = await lookup_with_responses(
        monkeypatch=monkeypatch,
        duration=225,
        responses=[(200, entry(syncedLyrics=None)), (200, [entry(id=2)])],
    )
    assert result.is_ok() and result.result().id == 2
    assert len(requests) == 2


@pytest.mark.asyncio
async def test_search_outage_keeps_successful_plain_exact_result(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, _ = await lookup_with_responses(
        monkeypatch=monkeypatch,
        duration=225,
        responses=[(200, entry(syncedLyrics=None)), (503, {})],
    )
    assert result.is_ok() and result.result().plainLyrics == "Example line"


@pytest.mark.asyncio
async def test_lrc_offset_and_repeated_tags_are_preserved(monkeypatch: pytest.MonkeyPatch) -> None:
    from lrclib.framework.lrclib import Lrclib

    async def fake_lookup(
        artist_name: str, track_name: str, album_name: str, duration: float
    ) -> Result[LyricsResponse]:
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=LyricsResponse.model_validate(
                entry(
                    plainLyrics=None, syncedLyrics="[offset:1000]\n[00:20][00:10.50] Repeated line"
                )
            ),
        )

    monkeypatch.setattr("lrclib.framework.lrclib.lookup_lyrics_async", fake_lookup)
    result = await Lrclib.fetch_lyrics_async(
        artist_name="twenty one pilots",
        track_name="The Contract",
        album_name="Breach",
        duration=225,
    )
    assert result.is_ok()
    _, data = result.result()
    assert data is not None
    assert data.offset == 1
    assert [line.timestamp_s for line in data.lines] == [10.5, 20]
    assert all(line.text == "Repeated line" for line in data.lines)


@pytest.mark.asyncio
async def test_plain_only_retry_adds_sync_without_overwriting_text_or_offset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from types import SimpleNamespace
    from typing import cast

    from sqlalchemy.ext.asyncio import AsyncSession

    from core.access.db.ormModels.media import CoreMediaRow
    from core.access.mediaAccess import MediaAccess
    from core.framework.media.media import Media
    from core.models.lyrics import DynamicLyrics, DynamicLyricsData, Lyrics
    from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
    from lrclib.access.lyricsAccess import LyricsAccess
    from lrclib.framework.lrclib import Lrclib

    media = CoreMediaRow(id=1, provider_id=1, media_type_key=1, public_id="m")
    saved: list[tuple[list[Lyrics] | None, float | None]] = []

    async def medias(session: AsyncSession, ids: list[int]) -> Result[list[CoreMediaRow]]:
        return Result(code=ResultCode.OK, message="OK", result=[media])

    async def song(session: AsyncSession, public_id: str) -> Result[BaseSongWithAlbumResponse]:
        source = cast(
            BaseSongWithAlbumResponse,
            SimpleNamespace(
                artists=[SimpleNamespace(name="Artist")],
                name="Title",
                album=SimpleNamespace(name="Album"),
                duration_ms=1000,
                provider="local",
            ),
        )
        return Result(code=ResultCode.OK, message="OK", result=source)

    async def fetch(
        artist_name: str, track_name: str, album_name: str, duration: float
    ) -> Result[tuple[list[Lyrics] | None, DynamicLyricsData | None]]:
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=(
                [Lyrics(text="Fetched text")],
                DynamicLyricsData(lines=[DynamicLyrics(text="Synced text", timestamp_s=1)]),
            ),
        )

    async def save(
        session: AsyncSession,
        media_id: int,
        lyrics: list[Lyrics] | None,
        dynamic_lyrics: list[DynamicLyrics] | None,
        offset: float | None = None,
    ) -> Result[str]:
        saved.append((lyrics, offset))
        return Result(code=ResultCode.OK, message="OK", result="original-id")

    monkeypatch.setattr(MediaAccess, "get_medias_from_ids_async", medias)
    monkeypatch.setattr(Media, "get_song_async", song)
    monkeypatch.setattr(Lrclib, "fetch_lyrics_async", fetch)
    monkeypatch.setattr(LyricsAccess, "save_lyrics_async", save)
    result = await Lrclib._fetch_and_save_lyrics_batch_async(  # pyright: ignore[reportPrivateUsage]
        session=cast(AsyncSession, object()),
        media_ids=[1],
        preserve_plain=True,
    )
    assert result.is_ok()
    assert saved == [(None, None)]


@pytest.mark.parametrize(
    "left,right",
    [
        ("Beyoncé", "Beyonce\u0301"),
        ("Don’t Start Now", "Don't Start Now"),
        ("Hello\u00a0World", "Hello World"),
        ("The\u200b Hype", "The Hype"),
        ("co\u00adoperate", "cooperate"),
        ("Ｄｕａ Ｌｉｐａ", "Dua Lipa"),
        ("𝓓𝓾𝓪 𝓛𝓲𝓹𝓪", "Dua Lipa"),
    ],
)
def test_canonical_unicode_equivalences(left: str, right: str) -> None:
    from lrclib.framework.lyricsLookup import normalize

    assert normalize(value=left) == normalize(value=right)


@pytest.mark.parametrize(
    "left,right",
    [
        ("Beyoncé", "Beyonce"),
        ("Déjà Vu", "Deja Vu"),
        ("Peña", "Pena"),
        ("MØ", "MO"),
        ("Łódź", "Lodz"),
    ],
)
def test_latin_folding_is_an_explicit_secondary_comparison(left: str, right: str) -> None:
    from lrclib.framework.lyricsLookup import folded, normalize

    assert normalize(value=left) != normalize(value=right)
    assert folded(value=left) == folded(value=right)


@pytest.mark.parametrize(
    "left,right",
    [
        ("P!nk", "Pink"),
        ("AC+DC", "AC DC"),
        ("ΜΟ", "MO"),
        ("Сергей", "Sergei"),
        ("東京", "Tokyo"),
        ("كَ", "كُ"),
    ],
)
def test_symbols_and_non_latin_identities_are_not_guessed(left: str, right: str) -> None:
    from lrclib.framework.lyricsLookup import folded

    assert folded(value=left) != folded(value=right)


def test_canonical_artist_wins_over_accent_fallback_even_if_other_timing_is_closer() -> None:
    from lrclib.framework.lyricsLookup import choose_candidate

    records = [
        LyricsResponse.model_validate(entry(id=1, artistName="Cafe", duration=225)),
        LyricsResponse.model_validate(entry(id=2, artistName="Café", duration=265)),
    ]
    result = choose_candidate(
        records=records,
        artist="Café",
        title="The Contract",
        album="Breach",
        duration=225,
        allow_relaxed=True,
    )
    assert result is not None and result.id == 2


def test_ambiguous_folded_artist_names_are_not_resolved_by_duration_or_album() -> None:
    from lrclib.framework.lyricsLookup import choose_candidate

    records = [
        LyricsResponse.model_validate(entry(id=1, artistName="Cafe", duration=225)),
        LyricsResponse.model_validate(entry(id=2, artistName="Café", duration=265)),
    ]
    result = choose_candidate(
        records=records,
        artist="Càfe",
        title="The Contract",
        album="Breach",
        duration=225,
        allow_relaxed=True,
    )
    assert result is None


@pytest.mark.parametrize(
    "title,album",
    [
        ("The Hype（Berlín）", "The Hype"),
        ("The Hype", "The Hype（Alt Mix）"),
        ("The Hype - Líve", "The Hype"),
    ],
)
def test_unicode_fallback_never_erases_a_recording_version(title: str, album: str) -> None:
    from lrclib.framework.lyricsLookup import matches

    record = LyricsResponse.model_validate(
        entry(artistName="Artísta", trackName=title, albumName=album)
    )
    assert not matches(
        record=record, artist="Artista", title="The Hype", album="Trench", relaxed=True
    )


@pytest.mark.asyncio
async def test_unicode_search_variants_are_bounded_and_originals_are_preserved(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    candidate = entry(artistName="Beyonce", trackName="Deja Vu")
    original = dict(candidate)
    result, requests = await lookup_with_responses(
        monkeypatch=monkeypatch,
        artist="Beyoncé",
        title="Déjà Vu",
        responses=[(404, {}), (200, []), (200, [candidate]), (200, [candidate])],
    )
    assert result.is_ok() and result.result().artistName == "Beyonce"
    assert requests[0].url.params["artist_name"] == "Beyoncé"
    assert requests[0].url.params["track_name"] == "Déjà Vu"
    assert requests[2].url.params["artist_name"] == "beyonce"
    assert set(requests[-1].url.params) == {"track_name"}
    assert len(requests) <= 5
    assert candidate == original


@pytest.mark.asyncio
async def test_title_only_search_still_filters_artist_and_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, requests = await lookup_with_responses(
        monkeypatch=monkeypatch,
        responses=[
            (404, {}),
            (200, []),
            (200, [entry(artistName="Other"), entry(trackName="The Contract (Live)")]),
        ],
    )
    assert result.is_not_ok() and result.code_str() == "NOT_FOUND"
    assert set(requests[-1].url.params) == {"track_name"}


@pytest.mark.asyncio
async def test_partial_search_failure_does_not_accept_unchecked_loose_identity(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, _ = await lookup_with_responses(
        monkeypatch=monkeypatch,
        artist="Beyoncé",
        title="Déjà Vu",
        responses=[(404, {}), (200, [entry(artistName="Beyonce", trackName="Deja Vu")]), (503, {})],
    )
    assert result.is_not_ok() and result.code_str() == "GENERAL_ERROR"


def test_optional_release_metadata_does_not_discard_plain_only_lyrics() -> None:
    record = LyricsResponse.model_validate(
        {
            "id": 1,
            "trackName": "Déjà Vu",
            "artistName": "Beyoncé",
            "albumName": None,
            "plainLyrics": "Example line",
        }
    )
    assert record.albumName == "" and record.name == ""
    assert record.syncedLyrics is None and record.duration == 0


@pytest.mark.parametrize("duration", [float("nan"), float("inf"), -1])
def test_invalid_provider_duration_cannot_pollute_candidate_ranking(duration: float) -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        LyricsResponse.model_validate(entry(duration=duration))
