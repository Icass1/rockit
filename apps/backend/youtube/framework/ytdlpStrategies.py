import os
from dataclasses import dataclass, field
from typing import Any

from constants import YTDLP_COOKIES_FILE, YTDLP_POT_PROVIDER_URL, YTDLP_SOURCE_ADDRESS
from logger import getLogger
from youtube.framework.youtubeGate import youtube_gate

logger = getLogger(__name__)


@dataclass
class YtdlpStrategy:
    """One way of asking YouTube for a video, with its own client and transport."""

    name: str

    # Merged into ydl_opts["extractor_args"]["youtube"].
    youtube_args: dict[str, list[str]] = field(default_factory=lambda: {})

    # Merged into ydl_opts at the top level (proxy, cookiefile, ...).
    extra_opts: dict[str, Any] = field(default_factory=lambda: {})

    # Take a fresh proxy from the rotation when the attempt is built.
    use_proxy: bool = False

    def build_opts(self, base_opts: dict[str, Any]) -> dict[str, Any]:
        """Return a copy of base_opts with this strategy's overrides applied."""

        opts: dict[str, Any] = dict(base_opts)

        extractor_args: dict[str, Any] = {
            key: dict(value) for key, value in base_opts.get("extractor_args", {}).items()
        }
        youtube_args: dict[str, list[str]] = dict(extractor_args.get("youtube", {}))
        youtube_args.update(self.youtube_args)
        extractor_args["youtube"] = youtube_args

        if YTDLP_POT_PROVIDER_URL:
            extractor_args["youtubepot-bgutilhttp"] = {"base_url": [YTDLP_POT_PROVIDER_URL]}

        opts["extractor_args"] = extractor_args
        opts.update(self.extra_opts)

        if self.use_proxy:
            proxy: str | None = youtube_gate.next_proxy()
            if proxy:
                opts["proxy"] = proxy

        if YTDLP_SOURCE_ADDRESS:
            opts["source_address"] = YTDLP_SOURCE_ADDRESS

        return opts


def _pot_provider_available() -> bool:
    """Whether a PO token provider is configured for this deployment."""

    return bool(YTDLP_POT_PROVIDER_URL)


def _cookies_available() -> bool:
    """Whether a usable cookies file is configured for this deployment."""

    if not YTDLP_COOKIES_FILE:
        return False

    if not os.path.exists(YTDLP_COOKIES_FILE):
        logger.warning(
            f"YTDLP_COOKIES_FILE points at '{YTDLP_COOKIES_FILE}' which does not "
            f"exist. Cookie strategies are disabled"
        )
        return False

    return True


def build_strategies() -> list[YtdlpStrategy]:
    """Build the ordered ladder of extraction strategies for this deployment.

    Prefer token-backed mweb when configured, then use supported fallbacks.
    """

    strategies: list[YtdlpStrategy] = []
    if _pot_provider_available():
        strategies.append(
            YtdlpStrategy(
                name="mweb+pot",
                youtube_args={"player_client": ["mweb"], "fetch_pot": ["always"]},
            )
        )

    strategies.append(
        YtdlpStrategy(name="android_vr", youtube_args={"player_client": ["android_vr"]})
    )
    # Safari HLS is a useful fallback. Let yt-dlp skip formats requiring a
    # missing token rather than forcing them into the format selection.
    strategies.append(
        YtdlpStrategy(name="web_safari", youtube_args={"player_client": ["web_safari"]})
    )

    if _cookies_available():
        # Authenticated clients survive longer per request but burn the account
        # if used from a flagged IP, so they sit near the bottom of the ladder.
        strategies.append(
            YtdlpStrategy(
                name="tv_downgraded+cookies",
                youtube_args={"player_client": ["tv_downgraded"]},
                extra_opts={"cookiefile": YTDLP_COOKIES_FILE},
            )
        )

    if youtube_gate.has_proxies():
        # Optional alternative transport; a proxy does not guarantee success.
        strategies.append(
            YtdlpStrategy(
                name="android_vr+proxy",
                youtube_args={"player_client": ["android_vr"]},
                use_proxy=True,
            )
        )
        if _pot_provider_available():
            strategies.append(
                YtdlpStrategy(
                    name="mweb+pot+proxy",
                    youtube_args={"player_client": ["mweb"], "fetch_pot": ["always"]},
                    use_proxy=True,
                )
            )

    logger.debug(f"yt-dlp strategy ladder: {', '.join(s.name for s in strategies)}")
    return strategies
