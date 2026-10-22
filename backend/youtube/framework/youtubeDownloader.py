import asyncio
import json
import os
import subprocess
from datetime import datetime, timezone
from typing import Any

from yt_dlp import YoutubeDL

from backend.constants import TEMP_PATH
from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow
from backend.core.access.downloadAccess import DownloadAccess
from backend.core.aResult import AResult, AResultCode
from backend.core.enums.downloadStatusEnum import DownloadStatusEnum
from backend.core.framework.websocket.webSocketManager import ws_manager
from backend.utils.logger import getLogger

from backend.youtube.enums.ytdlpFailureEnum import YtdlpFailureEnum
from backend.youtube.framework.youtubeGate import youtube_gate
from backend.youtube.framework.potProvider import PotProvider
from backend.youtube.utils.ytdlpLog import YtdlpLogger, sanitize_ytdlp_message
from backend.youtube.framework.ytdlpOptions import (
    build_download_opts,
    video_format_selector,
)
from backend.youtube.framework.ytdlpErrors import classify_ytdlp_error
from backend.youtube.framework.ytdlpStrategies import YtdlpStrategy, build_strategies


def _create_youtube_dl(opts: dict[str, Any]) -> YoutubeDL:
    return YoutubeDL(opts)  # type: ignore[arg-type]


def _download_once(opts: dict[str, Any], youtube_url: str) -> int | None:
    """Close yt-dlp resources after each fresh extraction and media transfer."""

    # Each extraction needs independent catalogue state, including concurrent jobs.
    attempt_opts = dict(opts)
    adapter = YtdlpLogger()
    attempt_opts["logger"] = adapter
    rejected_incomplete: bool = False

    if opts.get("merge_output_format") == "mp4":

        def match_quality(info: dict[str, Any], *, incomplete: bool) -> str | None:
            """Do not mistake filtered HD formats for a genuinely low-resolution source."""

            nonlocal rejected_incomplete
            height = info.get("height")
            if (
                not incomplete
                and height is not None
                and int(height) < 720
                and adapter.incomplete_formats
            ):
                rejected_incomplete = True
                return "HD formats were omitted by this client; refusing a degraded SD download"
            return None

        attempt_opts["match_filter"] = match_quality

    with _create_youtube_dl(opts=attempt_opts) as ydl:
        code = ydl.download([youtube_url])
    if rejected_incomplete:
        logger.warning(
            "Client omitted HD formats; trying another client or retrying later"
        )
        return 1
    return code


def _get_duration_with_ffprobe(filepath: str) -> int | None:
    try:
        cmd: list[str] = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            filepath,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and result.stdout.strip():
            duration_seconds = float(result.stdout.strip())
            duration_ms = int(duration_seconds * 1000)
            logger.info(f"FFprobe got duration: {duration_ms}ms for {filepath}")
            return duration_ms
        logger.warning(
            f"FFprobe failed for {filepath}: returncode={result.returncode}, stdout='{result.stdout.strip()}', stderr='{result.stderr.strip()}'"
        )
    except Exception as e:
        logger.error(f"FFprobe exception for {filepath}: {e}", exc_info=True)
    return None


def _log_downloaded_codecs(filepath: str) -> None:
    """Log the codecs of a downloaded file and warn if WebKit-incompatible."""

    try:
        cmd: list[str] = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,codec_name,profile,level,width,height,avg_frame_rate,bit_rate",
            "-of",
            "json",
            filepath,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            logger.warning(
                f"ffprobe failed to read codecs for {filepath}: "
                f"returncode={result.returncode}, stderr='{result.stderr.strip()}'"
            )
            return

        streams: list[dict[str, Any]] = json.loads(result.stdout).get("streams", [])
        summary: list[str] = []
        webkit_unsafe: bool = False
        for stream in streams:
            codec_type: str = stream.get("codec_type", "unknown")
            codec_name: str = stream.get("codec_name", "unknown")
            detail: str = codec_name
            profile: str = stream.get("profile") or ""
            level: Any = stream.get("level")
            if codec_type == "video":
                width = stream.get("width", 0)
                height = stream.get("height", 0)
                detail += (
                    f" {width}x{height} {stream.get('avg_frame_rate', 'unknown')} fps"
                )
                if 0 < int(height) < 720:
                    logger.warning(f"Downloaded video is below HD: {width}x{height}")
            bitrate = stream.get("bit_rate")
            if bitrate:
                detail += f" {bitrate} bps"
            if profile:
                detail += f" {profile}"
            if level is not None:
                detail += f"@{int(level)}"
            summary.append(f"{codec_type}={detail}")
            if codec_type == "video" and codec_name.lower() in ("vp8", "vp9", "av1"):
                webkit_unsafe = True

        logger.info(f"Codecs for {filepath}: {', '.join(summary)}")
        if webkit_unsafe:
            logger.warning(
                f"{filepath} uses a video codec not supported by iOS Safari/PWA "
                f"(WebKit); playback will fail there until re-downloaded with avc1"
            )
    except Exception as e:
        logger.error(f"Codec probe exception for {filepath}: {e}", exc_info=True)


logger = getLogger(__name__)


async def _insert_and_broadcast(
    download_id: int,
    download_public_id: str,
    user_id: int,
    public_id: str,
    title: str,
    artist: str,
    status: DownloadStatusEnum,
    progress: float,
    message: str,
    date_started: datetime,
    date_ended: datetime | None,
) -> None:
    async with rockit_db.session_scope_async() as session:
        a_result: AResult[DownloadStatusRow] = (
            await DownloadAccess.create_download_status(
                session=session,
                download_id=download_id,
                completed=progress,
                message=message,
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error inserting download status. {a_result.info()}")

    await ws_manager.broadcast_progress_async(
        user_id=user_id,
        download_public_id=download_public_id,
        media_public_id=public_id,
        title=title,
        subTitle=artist,
        status=status,
        progress=progress,
        date_started=date_started,
        date_ended=date_ended,
    )


def _candidate_urls(youtube_url: str, alternative_urls: list[str] | None) -> list[str]:
    """Build the ordered, de-duplicated list of URLs to try for one download."""

    urls: list[str] = [youtube_url]
    for url in alternative_urls or []:
        if url not in urls:
            urls.append(url)
    return urls


async def _download_with_candidates_async(
    youtube_urls: list[str],
    base_opts: dict[str, Any],
    output_path: str,
    filename: str,
) -> tuple[bool, str | None, YtdlpFailureEnum, str]:
    """Walk the candidate videos, running the full strategy ladder on each.

    YouTube gates videos individually, so when every client is refused on one
    video the same song on a different upload is often still downloadable. Only
    block-class failures move on to the next candidate: a video that is simply
    unavailable already told us everything we need to know.

    Returns (succeeded, url that worked, failure kind, last error message).
    """

    last_kind: YtdlpFailureEnum = YtdlpFailureEnum.UNKNOWN
    last_error: str = "No candidate was attempted"

    for index, youtube_url in enumerate(youtube_urls):
        if index > 0:
            logger.info(
                f"Falling back to candidate {index + 1}/{len(youtube_urls)}: "
                f"{youtube_url}"
            )

        succeeded, kind, error = await _download_with_strategies_async(
            youtube_url=youtube_url,
            base_opts=base_opts,
            output_path=output_path,
            filename=filename,
        )

        if succeeded:
            youtube_gate.record_success()
            return True, youtube_url, YtdlpFailureEnum.UNKNOWN, ""

        last_kind = kind
        last_error = error

        if kind not in (
            YtdlpFailureEnum.BLOCKED,
            YtdlpFailureEnum.UNAVAILABLE,
            YtdlpFailureEnum.MEDIA_FORBIDDEN,
        ):
            # A transient or unclassified error is not a reason to switch to a
            # different recording of the song; let the retry scheduler handle it.
            break

    if last_kind in (YtdlpFailureEnum.BLOCKED, YtdlpFailureEnum.RATE_LIMITED):
        # One block per download that ran out of both candidates and
        # strategies. That is what "YouTube is refusing us" actually looks
        # like, as opposed to a single video being gated.
        youtube_gate.record_block()

    return False, None, last_kind, last_error


_FAILURE_RESULT_CODES: dict[YtdlpFailureEnum, int] = {
    # A block is temporary by nature: back off and let the retry scheduler take
    # another run at it later, ideally once the circuit breaker has closed.
    YtdlpFailureEnum.BLOCKED: AResultCode.RATE_LIMITED,
    YtdlpFailureEnum.RATE_LIMITED: AResultCode.RATE_LIMITED,
    YtdlpFailureEnum.MEDIA_FORBIDDEN: AResultCode.RATE_LIMITED,
    YtdlpFailureEnum.CONFIGURATION: AResultCode.CONFIGURATION_ERROR,
    # Nothing we do will make a removed or geo-blocked video downloadable.
    YtdlpFailureEnum.UNAVAILABLE: AResultCode.NOT_FOUND,
    YtdlpFailureEnum.TRANSIENT: AResultCode.GENERAL_ERROR,
    YtdlpFailureEnum.UNKNOWN: AResultCode.GENERAL_ERROR,
    YtdlpFailureEnum.FORMAT_UNAVAILABLE: AResultCode.GENERAL_ERROR,
}


async def _fail_download_async(
    download_id: int,
    download_public_id: str,
    user_id: int,
    public_id: str,
    title: str,
    artist: str,
    date_started: datetime,
    failure_kind: YtdlpFailureEnum,
    failure_message: str,
) -> AResult[dict[str, Any]]:
    """Broadcast a failed download and map the failure onto an AResult code."""

    code: int = _FAILURE_RESULT_CODES.get(failure_kind, AResultCode.GENERAL_ERROR)

    logger.error(
        f"Download {download_public_id} failed ({failure_kind.name}): {failure_message}"
    )

    await _insert_and_broadcast(
        download_id=download_id,
        download_public_id=download_public_id,
        user_id=user_id,
        public_id=public_id,
        title=title,
        artist=artist,
        status=DownloadStatusEnum.FAILED,
        progress=0,
        message=f"Error: {failure_message}",
        date_started=date_started,
        date_ended=datetime.now(timezone.utc),
    )

    return AResult(
        code=code,
        message=failure_message,
        result=None,
    )


def _clean_partial_files(output_path: str, filename: str) -> None:
    """Remove anything a previous attempt left behind for this download.

    Only ever called before an attempt, and the output template is unique per
    download row, so a leftover file here is always debris from a failed run.
    Clearing it keeps yt-dlp from resuming a truncated or half-merged file.
    """

    for f in os.listdir(output_path):
        if not f.startswith(f"{filename}."):
            continue
        try:
            os.remove(os.path.join(output_path, f))
        except OSError as e:
            logger.warning(f"Could not remove leftover file {f}: {e}")


async def _download_with_strategies_async(
    youtube_url: str,
    base_opts: dict[str, Any],
    output_path: str,
    filename: str,
) -> tuple[bool, YtdlpFailureEnum, str]:
    """Try HD on every client before accepting a source available only in SD."""

    if base_opts.get("merge_output_format") == "mp4":
        hd_opts = dict(base_opts)
        hd_opts["format"] = video_format_selector(minimum_height=720)
        result = await _download_with_strategy_pass_async(
            youtube_url=youtube_url,
            base_opts=hd_opts,
            output_path=output_path,
            filename=filename,
        )
        if result[0] or result[1] != YtdlpFailureEnum.FORMAT_UNAVAILABLE:
            return result
        # A transfer failure is never permission to downgrade: only missing
        # HD formats on every client permits a second pass for native SD.
        logger.warning(
            "No client exposed a compatible HD format; trying native source resolution"
        )

    return await _download_with_strategy_pass_async(
        youtube_url=youtube_url,
        base_opts=base_opts,
        output_path=output_path,
        filename=filename,
    )


async def _download_with_strategy_pass_async(
    youtube_url: str,
    base_opts: dict[str, Any],
    output_path: str,
    filename: str,
) -> tuple[bool, YtdlpFailureEnum, str]:
    """Try each extraction strategy in turn until one of them downloads the media.

    Returns (succeeded, failure kind of the last attempt, last error message).
    A single client failing no longer fails the download: YouTube gates each
    client differently, so walking the ladder converts most hard failures into a
    slower success.
    """

    loop: asyncio.AbstractEventLoop = asyncio.get_event_loop()
    strategies: list[YtdlpStrategy] = build_strategies()

    last_kind: YtdlpFailureEnum = YtdlpFailureEnum.UNKNOWN
    last_error: str = "No strategy was attempted"
    transfer_failure: tuple[YtdlpFailureEnum, str] | None = None

    for index, strategy in enumerate(strategies):
        _clean_partial_files(output_path=output_path, filename=filename)

        # Space this attempt out from whatever else the process is doing.
        await youtube_gate.pace_async()

        opts: dict[str, Any] = strategy.build_opts(base_opts=base_opts)
        logger.info(
            f"Download attempt {index + 1}/{len(strategies)} for {youtube_url} "
            f"using strategy '{strategy.name}'"
        )

        try:
            code = await loop.run_in_executor(
                None,
                lambda o=opts: _download_once(opts=o, youtube_url=youtube_url),
            )
            if code not in (None, 0):
                logger.warning("yt-dlp returned a failed download status")
                last_kind = YtdlpFailureEnum.UNKNOWN
                last_error = "yt-dlp returned a failed download status"
                transfer_failure = (last_kind, last_error)
                continue
        except Exception as e:
            last_error = sanitize_ytdlp_message(message=str(e))
            last_kind = classify_ytdlp_error(error=e)

            if last_kind == YtdlpFailureEnum.UNAVAILABLE:
                # The video is gone or restricted for everyone. No client and no
                # IP will change that, so stop burning attempts on it.
                logger.warning(
                    f"{youtube_url} is unavailable, giving up after strategy "
                    f"'{strategy.name}': {last_error}"
                )
                return False, last_kind, last_error

            if last_kind in (
                YtdlpFailureEnum.RATE_LIMITED,
                YtdlpFailureEnum.CONFIGURATION,
            ):
                logger.warning(
                    f"Stopping strategy ladder ({last_kind.name}): {last_error}"
                )
                return False, last_kind, last_error

            if last_kind != YtdlpFailureEnum.FORMAT_UNAVAILABLE:
                transfer_failure = (last_kind, last_error)

            # Deliberately not recorded as a block against the gate: walking
            # the ladder is normal operation on a gated video, and counting
            # every rung let one unlucky song trip the circuit breaker on its
            # own. The gate is told once per download, by the caller.
            logger.warning(
                f"Strategy '{strategy.name}' failed ({last_kind.name}) for "
                f"{youtube_url}: {last_error}"
            )
            continue

        logger.info(f"Strategy '{strategy.name}' succeeded for {youtube_url}")
        return True, YtdlpFailureEnum.UNKNOWN, ""

    if transfer_failure is not None:
        return False, transfer_failure[0], transfer_failure[1]
    return False, last_kind, last_error


class YouTubeDownloader:
    @staticmethod
    async def download_as_mp3_async(
        youtube_url: str,
        download_id: int,
        user_id: int,
        public_id: str,
        title: str,
        artist: str,
        filename: str,
        alternative_urls: list[str] | None = None,
    ) -> AResult[dict[str, Any]]:
        return await YouTubeDownloader._download_async(
            youtube_url=youtube_url,
            alternative_urls=alternative_urls,
            download_id=download_id,
            user_id=user_id,
            public_id=public_id,
            title=title,
            artist=artist,
            filename=filename,
            format_type="mp3",
        )

    @staticmethod
    async def download_as_mp4_async(
        youtube_url: str,
        download_id: int,
        user_id: int,
        public_id: str,
        title: str,
        artist: str,
        filename: str,
        alternative_urls: list[str] | None = None,
    ) -> AResult[dict[str, Any]]:
        return await YouTubeDownloader._download_async(
            youtube_url=youtube_url,
            alternative_urls=alternative_urls,
            download_id=download_id,
            user_id=user_id,
            public_id=public_id,
            title=title,
            artist=artist,
            filename=filename,
            format_type="mp4",
        )

    @staticmethod
    async def _download_async(
        youtube_url: str,
        download_id: int,
        user_id: int,
        public_id: str,
        title: str,
        artist: str,
        filename: str,
        format_type: str,
        alternative_urls: list[str] | None = None,
    ) -> AResult[dict[str, Any]]:
        cooldown: float = youtube_gate.cooldown_remaining()
        if cooldown > 0:
            # YouTube is currently rate limiting us. Fail fast with a retryable
            # code so the downloads manager re-queues this instead of spending a
            # worker slot on an attempt that is going to be rejected anyway.
            logger.warning(
                f"Skipping download of {youtube_url}: YouTube cooldown active "
                f"for another {cooldown:.0f}s"
            )
            return AResult(
                code=AResultCode.RATE_LIMITED,
                message=f"YouTube rate limited, retrying in {cooldown:.0f}s",
            )

        provider_health = await PotProvider.check_health_async(max_age_seconds=60.0)
        if provider_health.is_not_ok():
            logger.error(
                f"YouTube download prerequisites failed: {provider_health.message()}"
            )
            return AResult(
                code=provider_health.code(), message=provider_health.message()
            )

        async with rockit_db.session_scope_async() as session:
            a_result_row = await DownloadAccess.get_download_by_id(
                session=session, download_id=download_id
            )
            if a_result_row.is_not_ok():
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Download row {download_id} not found",
                )
            download_row = a_result_row.result()
            download_public_id: str = download_row.public_id
            date_started: datetime = download_row.date_started

        output_path: str = TEMP_PATH
        os.makedirs(output_path, exist_ok=True)

        output_template: str = os.path.join(output_path, f"{filename}.%(ext)s")

        ydl_opts = build_download_opts(
            format_type=format_type, output_template=output_template
        )
        expected_ext = format_type

        loop: asyncio.AbstractEventLoop = asyncio.get_event_loop()

        def progress_hook(d: dict[str, Any]) -> None:
            status: str | None = d.get("status")
            if status == "downloading":
                total_bytes: float = float(
                    d.get("total_bytes") or d.get("total_bytes_estimate", 0)
                )
                downloaded_bytes: float = float(d.get("downloaded_bytes", 0))
                if total_bytes > 0:
                    percent: float = (downloaded_bytes / total_bytes) * 80
                    loop.call_soon_threadsafe(
                        asyncio.create_task,
                        _insert_and_broadcast(
                            download_id=download_id,
                            download_public_id=download_public_id,
                            user_id=user_id,
                            public_id=public_id,
                            title=title,
                            artist=artist,
                            status=DownloadStatusEnum.IN_PROGRESS,
                            progress=percent,
                            message=f"Downloading: {percent / 0.8:.1f}%",
                            date_started=date_started,
                            date_ended=None,
                        ),
                    )
            elif status == "finished":
                loop.call_soon_threadsafe(
                    asyncio.create_task,
                    _insert_and_broadcast(
                        download_id=download_id,
                        download_public_id=download_public_id,
                        user_id=user_id,
                        public_id=public_id,
                        title=title,
                        artist=artist,
                        status=DownloadStatusEnum.IN_PROGRESS,
                        progress=80,
                        message="Converting...",
                        date_started=date_started,
                        date_ended=None,
                    ),
                )

        ydl_opts["progress_hooks"] = [progress_hook]

        try:
            await _insert_and_broadcast(
                download_id=download_id,
                download_public_id=download_public_id,
                user_id=user_id,
                public_id=public_id,
                title=title,
                artist=artist,
                status=DownloadStatusEnum.IN_PROGRESS,
                progress=0,
                message="Starting download...",
                date_started=date_started,
                date_ended=None,
            )

            succeeded: bool
            failure_kind: YtdlpFailureEnum
            failure_message: str
            downloaded_url: str | None
            succeeded, downloaded_url, failure_kind, failure_message = (
                await _download_with_candidates_async(
                    youtube_urls=_candidate_urls(
                        youtube_url=youtube_url, alternative_urls=alternative_urls
                    ),
                    base_opts=ydl_opts,
                    output_path=output_path,
                    filename=filename,
                )
            )

            if not succeeded:
                return await _fail_download_async(
                    download_id=download_id,
                    download_public_id=download_public_id,
                    user_id=user_id,
                    public_id=public_id,
                    title=title,
                    artist=artist,
                    date_started=date_started,
                    failure_kind=failure_kind,
                    failure_message=failure_message,
                )

            final_filename: str | None = None
            final_path: str | None = None

            if expected_ext:
                final_filename = f"{filename}.{expected_ext}"
                final_path = os.path.join(output_path, final_filename)
                if not os.path.exists(final_path):
                    final_path = None

            if not final_path:
                logger.error(
                    "yt-dlp returned without producing the expected output file"
                )
                return await _fail_download_async(
                    download_id=download_id,
                    download_public_id=download_public_id,
                    user_id=user_id,
                    public_id=public_id,
                    title=title,
                    artist=artist,
                    date_started=date_started,
                    failure_kind=YtdlpFailureEnum.TRANSIENT,
                    failure_message="Expected output file is missing after download",
                )

            real_duration_ms: int | None = (
                _get_duration_with_ffprobe(final_path) if final_path else None
            )
            if final_path:
                _log_downloaded_codecs(final_path)

            return AResult(
                code=AResultCode.OK,
                message="Download completed",
                result={
                    "filepath": final_path,
                    "duration_ms": real_duration_ms,
                    "source_url": downloaded_url,
                },
            )

        except Exception as e:
            logger.error(
                f"Error downloading YouTube video: {sanitize_ytdlp_message(message=str(e))}"
            )
            return await _fail_download_async(
                download_id=download_id,
                download_public_id=download_public_id,
                user_id=user_id,
                public_id=public_id,
                title=title,
                artist=artist,
                date_started=date_started,
                failure_kind=classify_ytdlp_error(error=e),
                failure_message=sanitize_ytdlp_message(message=str(e)),
            )
