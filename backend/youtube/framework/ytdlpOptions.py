from typing import Any

from backend.constants import YTDLP_RATE_LIMIT_BYTES
from backend.youtube.utils.ytdlpLog import YtdlpLogger


def _retry_sleep(n: int) -> int:
    return 2 ** min(n, 5)


# Pace extraction requests and keep retries bounded. Client fallback and the
# shared cooldown are handled by the downloader and scheduler.
def _build_pacing_opts() -> dict[str, Any]:
    """Build the throttling options applied to every yt-dlp invocation."""

    opts: dict[str, Any] = {
        "js_runtimes": {"node": {}},
        "verbose": True,
        "retries": 3,
        "fragment_retries": 3,
        "extractor_retries": 2,
        "retry_sleep": _retry_sleep,
        "socket_timeout": 30,
        "sleep_interval_requests": 1,
        "sleep_interval": 1,
        "max_sleep_interval": 5,
        # Deliberately no "user_agent": each InnerTube client ships its own, and
        # overriding it globally leaves the User-Agent disagreeing with the
        # client we claim to be, which is exactly what bot detection looks for.
    }

    if YTDLP_RATE_LIMIT_BYTES > 0:
        opts["ratelimit"] = YTDLP_RATE_LIMIT_BYTES

    return opts


def build_download_opts(format_type: str, output_template: str) -> dict[str, Any]:
    """Build identical extraction and runtime options for jobs and smoke checks."""

    if format_type == "mp3":
        ydl_opts: dict[str, Any] = {
            "format": "bestaudio/best",
            "outtmpl": output_template,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
            "quiet": True,
            # yt-dlp routes report_warning() through this logger, and that
            # is the only channel that carries PO token provider failures
            # ("Error reaching GET /ping", version mismatches). Suppressing
            # it made a broken provider look identical to a working one.
            "logger": YtdlpLogger(),
            **_build_pacing_opts(),
        }
    else:
        # Prefer H.264/AAC (avc1) for WebKit compatibility: iOS Safari/PWA
        # cannot play VP9/Opus inside an MP4 container, which is what plain
        # bestvideo picks for <=1080p. Falls back progressively when avc1
        # is unavailable. faststart moves the moov atom to the front of the
        # merged file, required by Safari for progressive/Range playback.
        format_string: str = (
            "bestvideo[height<=1080][vcodec^=avc1]+bestaudio[acodec^=mp4a]/"
            "bestvideo[height<=1080][vcodec^=avc1]+bestaudio/"
            "best[height<=1080]/best"
        )
        ydl_opts = {
            "format": format_string,
            "merge_output_format": "mp4",
            "postprocessor_args": {"merger": ["-movflags", "+faststart"]},
            "outtmpl": output_template,
            "logger": YtdlpLogger(),
            "ffmpeg_location": "/usr/bin",
            **_build_pacing_opts(),
        }

    return ydl_opts
