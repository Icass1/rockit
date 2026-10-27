import re

from logger import getLogger
from youtube.enums.ytdlpFailureEnum import YtdlpFailureEnum
from youtube.utils.ytdlpLog import sanitize_ytdlp_message

logger = getLogger(__name__)


# Ordered most specific first. yt-dlp wraps everything in DownloadError, so the
# message text is the only thing we can reliably classify on.
_BLOCKED_PATTERNS: list[str] = [
    r"sign in to confirm you.?re not a bot",
    r"confirm you.?re not a bot",
    r"this helps protect our community",
    r"unable to download api page",
    r"the following content is not available on this app",
    r"only images are available",
    r"failed to extract any player response",
    r"unable to extract (?:yt initial data|player)",
    r"missing a url",
    r"the page needs to be reloaded",
    r"fragment .* not found",
]

_UNAVAILABLE_PATTERNS: list[str] = [
    r"video unavailable",
    r"private video",
    r"this video has been removed",
    r"account associated with this video has been terminated",
    r"members[- ]only",
    r"join this channel",
    r"is not available in your country",
    r"blocked it (?:in|on) your country",
    r"age.?restricted",
    r"inappropriate for some users",
    r"video is unavailable",
    r"removed for violating",
    r"live event will begin",
    r"premieres in",
    r"is not a valid url",
    r"unsupported url",
]

_TRANSIENT_PATTERNS: list[str] = [
    r"timed out",
    r"timeout",
    r"connection reset",
    r"connection refused",
    r"connection aborted",
    r"temporary failure in name resolution",
    r"remote end closed connection",
    r"ssl",
    r"ffmpeg",
    r"postprocessing",
    r"no space left on device",
    r"http error 5\d\d",
]


def _matches(message: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, message) for pattern in patterns)


def classify_ytdlp_error(error: BaseException | str) -> YtdlpFailureEnum:
    """Classify a yt-dlp failure so the caller knows whether to try another strategy."""

    message: str = str(error).lower()

    # Unavailable is checked first: "video unavailable" often arrives alongside
    # a 403, and a removed video must not be mistaken for a block.
    if _matches(message, _UNAVAILABLE_PATTERNS):
        return YtdlpFailureEnum.UNAVAILABLE

    if _matches(message, [r"http error 429", r"too many requests"]):
        return YtdlpFailureEnum.RATE_LIMITED

    if _matches(
        message,
        [
            r"po token provider.*(?:not installed|mismatch)",
            r"no supported javascript runtime",
            r"challenge solver.*not installed",
        ],
    ):
        return YtdlpFailureEnum.CONFIGURATION

    if "http error 403" in message:
        return YtdlpFailureEnum.MEDIA_FORBIDDEN

    if _matches(message, _TRANSIENT_PATTERNS):
        return YtdlpFailureEnum.TRANSIENT

    # An unavailable format is not evidence of an IP block. Another client
    # can still work, but this must not increment the global block streak.
    if "requested format is not available" in message or "no video formats found" in message:
        return YtdlpFailureEnum.FORMAT_UNAVAILABLE
    if "po token" in message:
        return YtdlpFailureEnum.UNKNOWN

    if _matches(message, _BLOCKED_PATTERNS):
        return YtdlpFailureEnum.BLOCKED

    logger.warning(
        f"Unclassified yt-dlp error, treating as unknown: "
        f"{sanitize_ytdlp_message(message=message[:300])}"
    )
    return YtdlpFailureEnum.UNKNOWN
