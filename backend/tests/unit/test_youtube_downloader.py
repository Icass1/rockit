"""Downloader policy regressions; no YouTube, PostgreSQL or sidecar calls."""

from contextlib import nullcontext
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from backend.core.aResult import AResult, AResultCode
from backend.youtube.enums.ytdlpFailureEnum import YtdlpFailureEnum
from backend.youtube.framework import potProvider, ytdlpStrategies, youtubeDownloader
from backend.youtube.framework.ytdlpErrors import classify_ytdlp_error
from backend.youtube.framework.ytdlpOptions import build_download_opts
from backend.youtube.utils.ytdlpLog import YtdlpLogger, sanitize_ytdlp_message
from backend.youtube.framework.download.youtubeDownload import YoutubeDownload
from backend.spotify.framework.download.spotifyDownload import SpotifyDownload

pytestmark = pytest.mark.unit


@pytest.mark.parametrize(
    "provider,first", [(None, "android_vr"), ("http://pot:4416", "mweb+pot")]
)
def test_strategy_selection_never_forces_missing_tokens(monkeypatch, provider, first):
    monkeypatch.setattr(ytdlpStrategies, "YTDLP_POT_PROVIDER_URL", provider)
    monkeypatch.setattr(ytdlpStrategies, "YTDLP_COOKIES_FILE", None)
    monkeypatch.setattr(ytdlpStrategies.youtube_gate, "has_proxies", lambda: False)
    strategies = ytdlpStrategies.build_strategies()
    assert strategies[0].name == first
    for strategy in strategies:
        assert "missing_pot" not in strategy.youtube_args.get("formats", [])
    if provider:
        opts = strategies[0].build_opts(
            base_opts={"extractor_args": {"other": {"key": ["value"]}}}
        )
        assert opts["extractor_args"]["youtube"]["fetch_pot"] == ["always"]
        assert opts["extractor_args"]["youtubepot-bgutilhttp"]["base_url"] == [provider]
        assert opts["extractor_args"]["other"] == {"key": ["value"]}


@pytest.mark.parametrize("format_type", ["mp3", "mp4"])
def test_audio_and_video_share_installed_js_solver(format_type):
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
        ("Requested format is not available", YtdlpFailureEnum.UNKNOWN),
        ("PO token provider version mismatch", YtdlpFailureEnum.CONFIGURATION),
        ("Connection reset", YtdlpFailureEnum.TRANSIENT),
    ],
)
def test_failure_classification(message, kind):
    assert classify_ytdlp_error(error=message) == kind


def test_configuration_errors_do_not_retry_and_forbidden_uses_long_backoff():
    config = AResultCode(code=AResultCode.CONFIGURATION_ERROR, message="Rebuild")
    assert not config.is_retryable()
    assert config.get_http_code() == 503
    forbidden = AResultCode(
        code=youtubeDownloader._FAILURE_RESULT_CODES[YtdlpFailureEnum.MEDIA_FORBIDDEN],
        message="403",
    )
    assert forbidden.is_retryable() and forbidden.is_rate_limited()


@pytest.mark.parametrize("wrapper", [YoutubeDownload, SpotifyDownload])
async def test_download_wrappers_preserve_error_codes(monkeypatch, wrapper):
    # Stop before filesystem or DB writes: failed extraction must preserve the
    # exact result used by the scheduler, including non-retryable setup errors.
    module = __import__(wrapper.__module__, fromlist=["unused"])
    item = object.__new__(wrapper)
    item.public_id = "public"
    item.download_id = 1
    item.user_id = 1
    if wrapper is YoutubeDownload:
        item.youtube_url = "https://www.youtube.com/watch?v=test"
        item.youtube_video_id = "test"
        monkeypatch.setattr(
            module.Video,
            "get_video_from_public_id_async",
            AsyncMock(
                return_value=AResult(code=AResultCode.NOT_FOUND, message="missing")
            ),
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
            AsyncMock(
                return_value=AResult(code=AResultCode.OK, message="OK", result=track)
            ),
        )
        monkeypatch.setattr(
            module.SpotifyAccess,
            "get_artists_from_track_row_async",
            AsyncMock(
                return_value=AResult(code=AResultCode.OK, message="OK", result=[])
            ),
        )
    for code in (
        AResultCode.RATE_LIMITED,
        AResultCode.CONFIGURATION_ERROR,
        AResultCode.NOT_FOUND,
    ):
        monkeypatch.setattr(
            module.YouTubeDownloader,
            (
                "download_as_mp4_async"
                if wrapper is YoutubeDownload
                else "download_as_mp3_async"
            ),
            AsyncMock(return_value=AResult(code=code, message="failed")),
        )
        result = await item.download_method_async(session=AsyncMock())
        assert result.code() == code


@pytest.mark.parametrize("first_failure", ["403", "status"])
async def test_ladder_refreshes_extraction_and_cleans_only_own_partial_files(
    monkeypatch, tmp_path, first_failure
):
    strategies = [
        ytdlpStrategies.YtdlpStrategy(name="first"),
        ytdlpStrategies.YtdlpStrategy(name="fallback"),
    ]
    monkeypatch.setattr(youtubeDownloader, "build_strategies", lambda: strategies)
    monkeypatch.setattr(youtubeDownloader.youtube_gate, "pace_async", AsyncMock())
    unrelated = tmp_path / "video_10.mp4"
    unrelated.write_bytes(b"keep")
    calls = []

    def create(opts):
        def download(urls):
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
    result = await youtubeDownloader._download_with_strategies_async(
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
    monkeypatch, kind, blocks
):
    monkeypatch.setattr(
        youtubeDownloader,
        "_download_with_strategies_async",
        AsyncMock(return_value=(False, kind, "failed")),
    )
    record = Mock()
    monkeypatch.setattr(youtubeDownloader.youtube_gate, "record_block", record)
    await youtubeDownloader._download_with_candidates_async(
        youtube_urls=["video"], base_opts={}, output_path="unused", filename="unused"
    )
    assert record.call_count == blocks


@pytest.mark.parametrize(
    "error", ["HTTP Error 429: Too Many Requests", "PO token provider version mismatch"]
)
async def test_rate_limits_and_configuration_errors_stop_client_ladder(
    monkeypatch, tmp_path, error
):
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
    result = await youtubeDownloader._download_with_strategies_async(
        youtube_url="video", base_opts={}, output_path=str(tmp_path), filename="test"
    )
    assert not result[0] and create.call_count == 1


async def test_provider_health_cache_and_recovery(monkeypatch):
    monkeypatch.setattr(potProvider.PotProvider, "_last_result", None)
    monkeypatch.setattr(potProvider.metadata, "version", lambda package: "2.0.2")
    monkeypatch.setattr(potProvider.shutil, "which", lambda name: "/node")
    monkeypatch.setattr(
        potProvider.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout="v22.0.0"),
    )
    check = AsyncMock(
        side_effect=[
            AResult(code=AResultCode.GENERAL_ERROR, message="unreachable"),
            AResult(code=AResultCode.OK, message="OK", result="2.0.2"),
        ]
    )
    monkeypatch.setattr(potProvider.PotProvider, "_check_provider_async", check)
    first = await potProvider.PotProvider.check_health_async()
    cached = await potProvider.PotProvider.check_health_async(max_age_seconds=60)
    assert first is cached and first.is_not_ok() and check.await_count == 1
    recovered = await potProvider.PotProvider.check_health_async()
    assert recovered.is_ok() and check.await_count == 2


async def test_missing_runtime_stops_downloads_without_retry(monkeypatch):
    monkeypatch.setattr(potProvider.PotProvider, "_last_result", None)
    monkeypatch.setattr(potProvider.shutil, "which", lambda name: None)
    result = await potProvider.PotProvider.check_health_async()
    assert (
        result.code() == AResultCode.CONFIGURATION_ERROR and not result.is_retryable()
    )


@pytest.mark.parametrize(
    "plugin,reachable,server,code",
    [
        (None, True, "2.0.2", AResultCode.CONFIGURATION_ERROR),
        ("2.0.2", True, "1.3.2", AResultCode.CONFIGURATION_ERROR),
        ("2.0.2", False, "connection refused", AResultCode.GENERAL_ERROR),
        ("2.0.2", True, "2.0.2", AResultCode.OK),
    ],
)
async def test_provider_readiness_distinguishes_configuration_and_outages(
    monkeypatch, plugin, reachable, server, code
):
    monkeypatch.setattr(potProvider, "YTDLP_POT_PROVIDER_URL", "http://pot:4416")
    monkeypatch.setattr(potProvider.PotProvider, "_plugin_version", lambda: plugin)
    monkeypatch.setattr(
        potProvider.PotProvider, "_is_plugin_discoverable", lambda: plugin is not None
    )
    monkeypatch.setattr(
        potProvider.PotProvider, "_ping", lambda base_url: (reachable, server)
    )
    result = await potProvider.PotProvider._check_provider_async()
    assert result.code() == code


def test_signed_urls_and_proxy_credentials_are_removed():
    message = "403 https://video.example/play?pot=SECRET&sig=SIGNED proxy http://user:password@proxy:8000/path"
    clean = sanitize_ytdlp_message(message=message)
    assert clean == "403 [url] proxy [url]"


async def test_partial_file_cannot_be_reported_as_completed(monkeypatch, tmp_path):
    from contextlib import asynccontextmanager
    from datetime import datetime, timezone

    @asynccontextmanager
    async def session_scope_async():
        yield AsyncMock()

    monkeypatch.setattr(
        youtubeDownloader.rockit_db, "session_scope_async", session_scope_async
    )
    monkeypatch.setattr(youtubeDownloader.youtube_gate, "cooldown_remaining", lambda: 0)
    monkeypatch.setattr(
        youtubeDownloader.PotProvider,
        "check_health_async",
        AsyncMock(
            return_value=AResult(code=AResultCode.OK, message="OK", result="2.0.2")
        ),
    )
    row = SimpleNamespace(public_id="download", date_started=datetime.now(timezone.utc))
    monkeypatch.setattr(
        youtubeDownloader.DownloadAccess,
        "get_download_by_id",
        AsyncMock(return_value=AResult(code=AResultCode.OK, message="OK", result=row)),
    )
    monkeypatch.setattr(youtubeDownloader, "TEMP_PATH", str(tmp_path))
    monkeypatch.setattr(youtubeDownloader, "_insert_and_broadcast", AsyncMock())
    monkeypatch.setattr(
        youtubeDownloader,
        "_download_with_candidates_async",
        AsyncMock(return_value=(True, "video", YtdlpFailureEnum.UNKNOWN, "")),
    )
    (tmp_path / "check.f136.mp4.part").write_bytes(b"incomplete")
    result = await youtubeDownloader.YouTubeDownloader._download_async(
        youtube_url="video",
        download_id=1,
        user_id=1,
        public_id="public",
        title="Title",
        artist="Artist",
        filename="check",
        format_type="mp4",
    )
    assert result.is_not_ok() and result.code() == AResultCode.GENERAL_ERROR


def test_logger_preserves_provider_diagnostics_without_verbose_secrets(monkeypatch):
    from backend.youtube.utils import ytdlpLog

    log = Mock()
    monkeypatch.setattr(ytdlpLog, "logger", log)
    adapter = YtdlpLogger()
    adapter.debug(msg="[debug] headers: Authorization: SECRET")
    log.info.assert_not_called()
    adapter.debug(
        msg="[debug] [youtube] [pot] PO Token Providers: bgutil:http-2.0.2 (external)"
    )
    adapter.info(
        msg="[youtube] [pot:bgutil:http] Generating a gvs PO Token for mweb client"
    )
    assert log.info.call_count == 2
    assert "Generating a gvs PO Token" in log.info.call_args.args[0]
