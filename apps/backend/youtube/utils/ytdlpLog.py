import re

from logger import getLogger

logger = getLogger(__name__)


def sanitize_ytdlp_message(message: str) -> str:
    """Remove URLs, including credentials and signed query strings, from diagnostics."""

    return re.sub(r"https?://[^\s\"'<>]+|socks5h?://[^\s\"'<>]+", "[url]", message)


class YtdlpLogger:
    """Keep operational diagnostics without dumping yt-dlp's sensitive debug output."""

    def __init__(self) -> None:
        """Track warnings that indicate an incomplete format catalogue."""

        self.incomplete_formats: bool = False

    def debug(self, msg: str) -> None:
        """Expose provider discovery, while discarding verbose headers and URLs."""

        if msg.startswith("[debug]"):
            if "PO Token Providers:" in msg or "JS runtimes:" in msg:
                logger.info(sanitize_ytdlp_message(message=msg))
            return
        self.info(msg=msg)

    def info(self, msg: str) -> None:
        """Include token generation messages without raw URLs or tokens."""

        if "Sleeping" in msg:
            return
        logger.info(f"[yt-dlp] {sanitize_ytdlp_message(message=msg)}")

    def warning(self, msg: str) -> None:
        """Report sanitized extractor and provider warnings."""

        message = msg.lower()
        if (
            "sabr-only" in message
            or ("formats" in message and "missing a url" in message)
            or ("formats" in message and "po token" in message and "skipped" in message)
        ):
            self.incomplete_formats = True
        logger.warning(f"[yt-dlp] {sanitize_ytdlp_message(message=msg)}")

    def error(self, msg: str) -> None:
        """Report sanitized download failures."""

        logger.error(f"[yt-dlp] {sanitize_ytdlp_message(message=msg)}")
