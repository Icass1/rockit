import re

from backend.utils.logger import getLogger

logger = getLogger(__name__)


def sanitize_ytdlp_message(message: str) -> str:
    """Remove URLs, including credentials and signed query strings, from diagnostics."""

    return re.sub(r"https?://[^\s\"'<>]+|socks5h?://[^\s\"'<>]+", "[url]", message)


class YtdlpLogger:
    """Keep operational diagnostics without dumping yt-dlp's sensitive debug output."""

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

        logger.warning(f"[yt-dlp] {sanitize_ytdlp_message(message=msg)}")

    def error(self, msg: str) -> None:
        """Report sanitized download failures."""

        logger.error(f"[yt-dlp] {sanitize_ytdlp_message(message=msg)}")
