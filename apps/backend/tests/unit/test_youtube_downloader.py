"""Downloader policy regressions; no YouTube, PostgreSQL or sidecar calls."""

from collections.abc import AsyncGenerator
from contextlib import nullcontext
from datetime import UTC
from pathlib import Path
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock, Mock

import pytest
from yt_dlp import YoutubeDL

from result import Result, ResultCode
from spotify.framework.download.spotifyDownload import SpotifyDownload
from youtube.enums.ytdlpFailureEnum import YtdlpFailureEnum
from youtube.framework import potProvider, youtubeDownloader, ytdlpStrategies
from youtube.framework.download.youtubeDownload import YoutubeDownload
from youtube.framework.ytdlpErrors import classify_ytdlp_error
from youtube.framework.ytdlpOptions import (
    build_download_opts,
    video_format_selector,
)
from youtube.utils.ytdlpLog import YtdlpLogger, sanitize_ytdlp_message

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("provider,first", [(None, "android_vr"), ("http://pot:4416", "mweb+pot")])
def test_strategy_selection_never_forces_missing_tokens(
    monkeypatch: pytest.MonkeyPatch, provider: str | None, first: str
) -> None:
    monkeypatch.setattr(ytdlpStrategies, "YTDLP_POT_PROVIDER_URL", provider)
    monkeypatch.setattr(ytdlpStrategies, "YTDLP_COOKIES_FILE", None)
    monkeypatch.setattr(ytdlpStrategies.youtube_gate, "has_proxies", lambda: False)
    strategies = ytdlpStrategies.build_strategies()
    assert strategies[0].name == first
    for strategy in strategies:
        assert "missing_pot" not in strategy.youtube_args.get("formats", [])
    if provider:
        opts = strategies[0].build_opts(base_opts={"extractor_args": {"other": {"key": ["value"]}}})
        assert opts["extractor_args"]["youtube"]["fetch_pot"] == ["always"]
        assert opts["extractor_args"]["youtubepot-bgutilhttp"]["base_url"] == [provider]
        assert opts["extractor_args"]["other"] == {"key": ["value"]}


@pytest.mark.parametrize("format_type", ["mp3", "mp4"])
def test_audio_and_video_share_installed_js_solver(format_type: str) -> None:
    opts = build_download_opts(format_type=format_type, output_template="check.%(ext)s")
    assert opts["js_runtimes"] == {"node": {}}
    assert "remote_components" not in opts
    assert isinstance(opts["logger"], YtdlpLogger)
    if format_type == "mp4":
        assert "vcodec^=avc1" in opts["format"]
        assert opts["postprocessor_args"]["merger"] == ["-movflags", "+faststart"]


@pytest.mark.parametrize(
    "message,kind",
    [
        ("HTTP Error 403: Forbidden", YtdlpFailureEnum.MEDIA_FORBIDDEN),
        ("HTTP Error 429: Too Many Requests", YtdlpFailureEnum.RATE_LIMITED),
        ("Sign in to confirm you're not a bot", YtdlpFailureEnum.BLOCKED),
        ("Private video: HTTP Error 403", YtdlpFailureEnum.UNAVAILABLE),
        ("Requested format is not available", YtdlpFailureEnum.FORMAT_UNAVAILABLE),
        ("PO token provider version mismatch", YtdlpFailureEnum.CONFIGURATION),
        ("Connection reset", YtdlpFailureEnum.TRANSIENT),
    ],
)
def test_failure_classification(message: str, kind: YtdlpFailureEnum) -> None:
    assert classify_ytdlp_error(error=message) == kind


def test_configuration_errors_do_not_retry_and_forbidden_uses_long_backoff() -> None:
    config = ResultCode(code=ResultCode.CONFIGURATION_ERROR, message="Rebuild")
    assert not config.is_retryable()
    assert config.get_http_code() == 503
    forbidden = ResultCode(
        code=youtubeDownloader._FAILURE_RESULT_CODES[  # pyright: ignore[reportPrivateUsage]
            YtdlpFailureEnum.MEDIA_FORBIDDEN
        ],
        message="403",
    )
    assert forbidden.is_retryable() and forbidden.is_rate_limited()


@pytest.mark.parametrize("wrapper", [YoutubeDownload, SpotifyDownload])
async def test_download_wrappers_preserve_error_codes(
    monkeypatch: pytest.MonkeyPatch,
    wrapper: type[YoutubeDownload] | type[SpotifyDownload],
) -> None:
    # Stop before filesystem or DB writes: failed extraction must preserve the
    # exact result used by the scheduler, including non-retryable setup errors.
    module = __import__(wrapper.__module__, fromlist=["unused"])
    item = object.__new__(wrapper)
    item.public_id = "public"
    item.download_id = 1
    item.user_id = 1
    if isinstance(item, YoutubeDownload):
        item.youtube_url = "https://www.youtube.com/watch?v=test"
        item.youtube_video_id = "test"
        monkeypatch.setattr(
            module.Video,
            "get_video_from_public_id_async",
            AsyncMock(return_value=Result(code=ResultCode.NOT_FOUND, message="missing")),
        )
    else:
        item.track_spotify_id = 1
        track = SimpleNamespace(
            name="Track",
            download_url="https://youtube.com/watch?v=test",
            spotify_id="track",
        )
        monkeypatch.setattr(
            module.TrackAccess,
            "get_track_by_id_async",
            AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=track)),
        )
        monkeypatch.setattr(
            module.SpotifyAccess,
            "get_artists_from_track_row_async",
            AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=[])),
        )
    for code in (
        ResultCode.RATE_LIMITED,
        ResultCode.CONFIGURATION_ERROR,
        ResultCode.NOT_FOUND,
    ):
        monkeypatch.setattr(
            module.YouTubeDownloader,
            ("download_as_mp4_async" if wrapper is YoutubeDownload else "download_as_mp3_async"),
            AsyncMock(return_value=Result(code=code, message="failed")),
        )
        result = await item.download_method_async(session=AsyncMock())
        assert result.code() == code


@pytest.mark.parametrize("first_failure", ["403", "status"])
async def test_ladder_refreshes_extraction_and_cleans_only_own_partial_files(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, first_failure: str
) -> None:
    strategies = [
        ytdlpStrategies.YtdlpStrategy(name="first"),
        ytdlpStrategies.YtdlpStrategy(name="fallback"),
    ]
    monkeypatch.setattr(youtubeDownloader, "build_strategies", lambda: strategies)
    monkeypatch.setattr(youtubeDownloader.youtube_gate, "pace_async", AsyncMock())
    unrelated = tmp_path / "video_10.mp4"
    unrelated.write_bytes(b"keep")
    calls: list[dict[str, Any]] = []

    def create(opts: dict[str, Any]) -> nullcontext[SimpleNamespace]:
        def download(urls: list[str]) -> int:
            calls.append(opts)
            if len(calls) == 1:
                (tmp_path / "video_1.f136.mp4.part").write_bytes(b"partial")
                if first_failure == "status":
                    return 1
                raise RuntimeError("HTTP Error 403: Forbidden")
            assert not (tmp_path / "video_1.f136.mp4.part").exists()
            return 0

        return nullcontext(SimpleNamespace(download=download))

    monkeypatch.setattr(youtubeDownloader, "_create_youtube_dl", create)
    result = await youtubeDownloader._download_with_strategies_async(  # pyright: ignore[reportPrivateUsage]
        youtube_url="https://youtube.com/watch?v=test",
        base_opts={},
        output_path=str(tmp_path),
        filename="video_1",
    )
    assert result[0] and len(calls) == 2 and calls[0] is not calls[1]
    assert unrelated.read_bytes() == b"keep"


@pytest.mark.parametrize(
    "kind,blocks",
    [
        (YtdlpFailureEnum.MEDIA_FORBIDDEN, 0),
        (YtdlpFailureEnum.RATE_LIMITED, 1),
        (YtdlpFailureEnum.BLOCKED, 1),
    ],
)
async def test_only_throttling_or_challenges_increment_global_breaker(
    monkeypatch: pytest.MonkeyPatch, kind: YtdlpFailureEnum, blocks: int
) -> None:
    monkeypatch.setattr(
        youtubeDownloader,
        "_download_with_strategies_async",
        AsyncMock(return_value=(False, kind, "failed")),
    )
    record = Mock()
    monkeypatch.setattr(youtubeDownloader.youtube_gate, "record_block", record)
    await youtubeDownloader._download_with_candidates_async(  # pyright: ignore[reportPrivateUsage]
        youtube_urls=["video"], base_opts={}, output_path="unused", filename="unused"
    )
    assert record.call_count == blocks


@pytest.mark.parametrize(
    "error", ["HTTP Error 429: Too Many Requests", "PO token provider version mismatch"]
)
async def test_rate_limits_and_configuration_errors_stop_client_ladder(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, error: str
) -> None:
    monkeypatch.setattr(
        youtubeDownloader,
        "build_strategies",
        lambda: [
            ytdlpStrategies.YtdlpStrategy(name="first"),
            ytdlpStrategies.YtdlpStrategy(name="second"),
        ],
    )
    monkeypatch.setattr(youtubeDownloader.youtube_gate, "pace_async", AsyncMock())
    create = Mock(side_effect=RuntimeError(error))
    monkeypatch.setattr(youtubeDownloader, "_create_youtube_dl", create)
    result = await youtubeDownloader._download_with_strategies_async(  # pyright: ignore[reportPrivateUsage]
        youtube_url="video", base_opts={}, output_path=str(tmp_path), filename="test"
    )
    assert not result[0] and create.call_count == 1


async def test_provider_health_cache_and_recovery(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(potProvider.PotProvider, "_last_result", None)
    monkeypatch.setattr(potProvider.metadata, "version", Mock(return_value="2.0.2"))
    monkeypatch.setattr(potProvider.shutil, "which", Mock(return_value="/node"))
    monkeypatch.setattr(
        potProvider.subprocess,
        "run",
        Mock(return_value=SimpleNamespace(returncode=0, stdout="v22.0.0")),
    )
    check = AsyncMock(
        side_effect=[
            Result(code=ResultCode.GENERAL_ERROR, message="unreachable"),
            Result(code=ResultCode.OK, message="OK", result="2.0.2"),
        ]
    )
    monkeypatch.setattr(potProvider.PotProvider, "_check_provider_async", check)
    first = await potProvider.PotProvider.check_health_async()
    cached = await potProvider.PotProvider.check_health_async(max_age_seconds=60)
    assert first is cached and first.is_not_ok() and check.await_count == 1
    recovered = await potProvider.PotProvider.check_health_async()
    assert recovered.is_ok() and check.await_count == 2


async def test_missing_runtime_stops_downloads_without_retry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(potProvider.PotProvider, "_last_result", None)
    monkeypatch.setattr(potProvider.shutil, "which", Mock(return_value=None))
    result = await potProvider.PotProvider.check_health_async()
    assert result.code() == ResultCode.CONFIGURATION_ERROR and not result.is_retryable()


@pytest.mark.parametrize(
    "plugin,reachable,server,code",
    [
        (None, True, "2.0.2", ResultCode.CONFIGURATION_ERROR),
        ("2.0.2", True, "1.3.2", ResultCode.CONFIGURATION_ERROR),
        ("2.0.2", False, "connection refused", ResultCode.GENERAL_ERROR),
        ("2.0.2", True, "2.0.2", ResultCode.OK),
    ],
)
async def test_provider_readiness_distinguishes_configuration_and_outages(
    monkeypatch: pytest.MonkeyPatch,
    plugin: str | None,
    reachable: bool,
    server: str,
    code: int,
) -> None:
    monkeypatch.setattr(potProvider, "YTDLP_POT_PROVIDER_URL", "http://pot:4416")
    monkeypatch.setattr(potProvider.PotProvider, "_plugin_version", lambda: plugin)
    monkeypatch.setattr(
        potProvider.PotProvider, "_is_plugin_discoverable", lambda: plugin is not None
    )
    monkeypatch.setattr(potProvider.PotProvider, "_ping", Mock(return_value=(reachable, server)))
    result = (
        await potProvider.PotProvider._check_provider_async()  # pyright: ignore[reportPrivateUsage]
    )
    assert result.code() == code


def test_signed_urls_and_proxy_credentials_are_removed() -> None:
    message = "403 https://video.example/play?pot=SECRET&sig=SIGNED proxy http://user:password@proxy:8000/path"
    clean = sanitize_ytdlp_message(message=message)
    assert clean == "403 [url] proxy [url]"


async def test_partial_file_cannot_be_reported_as_completed(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from contextlib import asynccontextmanager
    from datetime import datetime

    @asynccontextmanager
    async def session_scope_async() -> AsyncGenerator[AsyncMock]:
        yield AsyncMock()

    monkeypatch.setattr(youtubeDownloader.db_context, "session_scope_async", session_scope_async)
    monkeypatch.setattr(youtubeDownloader.youtube_gate, "cooldown_remaining", lambda: 0)
    monkeypatch.setattr(
        youtubeDownloader.PotProvider,
        "check_health_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result="2.0.2")),
    )
    row = SimpleNamespace(public_id="download", date_started=datetime.now(UTC))
    monkeypatch.setattr(
        youtubeDownloader.DownloadAccess,
        "get_download_by_id",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=row)),
    )
    monkeypatch.setattr(youtubeDownloader, "TEMP_PATH", str(tmp_path))
    monkeypatch.setattr(youtubeDownloader, "_insert_and_broadcast", AsyncMock())
    monkeypatch.setattr(
        youtubeDownloader,
        "_download_with_candidates_async",
        AsyncMock(return_value=(True, "video", YtdlpFailureEnum.UNKNOWN, "")),
    )
    (tmp_path / "check.f136.mp4.part").write_bytes(b"incomplete")
    result = await youtubeDownloader.YouTubeDownloader._download_async(  # pyright: ignore[reportPrivateUsage]
        youtube_url="video",
        download_id=1,
        user_id=1,
        public_id="public",
        title="Title",
        artist="Artist",
        filename="check",
        format_type="mp4",
    )
    assert result.is_not_ok() and result.code() == ResultCode.GENERAL_ERROR


def test_logger_preserves_provider_diagnostics_without_verbose_secrets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from youtube.utils import ytdlpLog

    log = Mock()
    monkeypatch.setattr(ytdlpLog, "logger", log)
    adapter = YtdlpLogger()
    adapter.debug(msg="[debug] headers: Authorization: SECRET")
    log.info.assert_not_called()
    adapter.debug(msg="[debug] [youtube] [pot] PO Token Providers: bgutil:http-2.0.2 (external)")
    adapter.info(msg="[youtube] [pot:bgutil:http] Generating a gvs PO Token for mweb client")
    assert log.info.call_count == 2
    assert "Generating a gvs PO Token" in log.info.call_args.args[0]


@pytest.mark.parametrize("combined,low_quality_rank", [(True, 0), (False, 20)])
def test_format_selection_prefers_hd_over_low_resolution_video_only(
    combined: bool,
    low_quality_rank: int,
) -> None:
    opts = build_download_opts(format_type="mp4", output_template="unused.%(ext)s")
    opts["logger"] = Mock()
    formats: list[dict[str, Any]] = [
        {
            "format_id": "low",
            "url": "https://example.invalid/low.mp4",
            "ext": "mp4",
            "vcodec": "avc1.4d401e",
            "acodec": "none",
            "width": 640,
            "height": 360,
            "fps": 30,
            "quality": low_quality_rank,
        },
        {
            "format_id": "hd",
            "url": "https://example.invalid/hd.mp4",
            "ext": "mp4",
            "vcodec": "avc1.64002a",
            "acodec": "mp4a.40.2" if combined else "none",
            "width": 1920,
            "height": 1080,
            "fps": 60,
            "quality": 0,
        },
        {
            "format_id": "audio",
            "url": "https://example.invalid/audio.m4a",
            "ext": "m4a",
            "vcodec": "none",
            "acodec": "mp4a.40.2",
            "abr": 128,
        },
    ]
    with YoutubeDL(opts) as ydl:  # type: ignore[arg-type]
        info = cast(
            dict[str, Any],
            ydl.process_ie_result(
                {"id": "sample", "title": "Sample", "formats": formats}, download=False
            ),
        )
    assert info["width"] == 1920 and info["height"] == 1080
    assert info["format_id"] == ("hd" if combined else "hd+audio")


@pytest.mark.parametrize("hd_available", [True, False])
async def test_sd_requires_exhausting_hd_clients(
    monkeypatch: pytest.MonkeyPatch,
    hd_available: bool,
) -> None:
    result = (True, YtdlpFailureEnum.UNKNOWN, "")
    run_pass = AsyncMock(
        side_effect=(
            [result]
            if hd_available
            else [
                (False, YtdlpFailureEnum.FORMAT_UNAVAILABLE, "No HD format"),
                result,
            ]
        )
    )
    monkeypatch.setattr(youtubeDownloader, "_download_with_strategy_pass_async", run_pass)
    base = build_download_opts(format_type="mp4", output_template="unused.%(ext)s")
    downloaded = await youtubeDownloader._download_with_strategies_async(  # pyright: ignore[reportPrivateUsage]
        youtube_url="video",
        base_opts=base,
        output_path="unused",
        filename="sample",
    )
    assert downloaded[0]
    assert run_pass.call_args_list[0].kwargs["base_opts"]["format"] == video_format_selector(
        minimum_height=720
    )
    assert run_pass.await_count == (1 if hd_available else 2)
    if not hd_available:
        assert run_pass.call_args_list[1].kwargs["base_opts"]["format"] == video_format_selector()


async def test_hd_transfer_error_is_not_downgraded_after_missing_formats(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        youtubeDownloader,
        "build_strategies",
        lambda: [
            ytdlpStrategies.YtdlpStrategy(name="hd"),
            ytdlpStrategies.YtdlpStrategy(name="sd-only"),
        ],
    )
    monkeypatch.setattr(youtubeDownloader.youtube_gate, "pace_async", AsyncMock())
    transfer = Mock(
        side_effect=[
            RuntimeError("HTTP Error 403: Forbidden"),
            RuntimeError("Requested format is not available"),
        ]
    )
    monkeypatch.setattr(youtubeDownloader, "_download_once", transfer)
    result = await youtubeDownloader._download_with_strategies_async(  # pyright: ignore[reportPrivateUsage]
        youtube_url="video",
        base_opts=build_download_opts(format_type="mp4", output_template="unused.%(ext)s"),
        output_path=str(tmp_path),
        filename="sample",
    )
    assert not result[0] and result[1] == YtdlpFailureEnum.MEDIA_FORBIDDEN
    assert transfer.call_count == 2


@pytest.mark.parametrize(
    "height,incomplete_catalogue,expected",
    [(360, True, 1), (1080, True, 0), (360, False, 0)],
)
def test_filtered_hd_formats_cannot_silently_become_sd_success(
    monkeypatch: pytest.MonkeyPatch,
    height: int,
    incomplete_catalogue: bool,
    expected: int,
) -> None:
    def create(opts: dict[str, Any]) -> nullcontext[SimpleNamespace]:
        def download(urls: list[str]) -> int:
            if incomplete_catalogue:
                opts["logger"].warning(
                    "Some mweb client https formats have been skipped as they are "
                    "missing a URL. SABR-only streaming experiment"
                )
            assert opts["match_filter"]({"height": height}, incomplete=True) is None
            rejected = opts["match_filter"]({"height": height}, incomplete=False)
            assert (rejected is not None) == (expected == 1)
            return 0

        return nullcontext(SimpleNamespace(download=download))

    monkeypatch.setattr(youtubeDownloader, "_create_youtube_dl", create)
    result = youtubeDownloader._download_once(  # pyright: ignore[reportPrivateUsage]
        opts=build_download_opts(format_type="mp4", output_template="unused.%(ext)s"),
        youtube_url="video",
    )
    assert result == expected
