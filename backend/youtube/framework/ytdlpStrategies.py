import os
from dataclasses import dataclass, field
from typing import Any

from backend.constants import YTDLP_COOKIES_FILE
from backend.constants import YTDLP_POT_PROVIDER_URL
from backend.constants import YTDLP_SOURCE_ADDRESS

from backend.utils.logger import getLogger

from backend.youtube.framework.youtubeGate import youtube_gate

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
            key: dict(value)
            for key, value in base_opts.get("extractor_args", {}).items()
        }
        youtube_args: dict[str, list[str]] = dict(extractor_args.get("youtube", {}))
        youtube_args.update(self.youtube_args)
        extractor_args["youtube"] = youtube_args

        if YTDLP_POT_PROVIDER_URL:
            extractor_args["youtubepot-bgutilhttp"] = {
                "base_url": [YTDLP_POT_PROVIDER_URL]
            }

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

    Ordered cheapest and least detectable first. Each rung is only included when
    its prerequisites are configured, so a bare deployment still gets the two
    PO-token-free clients.
    """

    strategies: list[YtdlpStrategy] = [
        # ANDROID_VR needs neither a PO token nor the JS player, which makes it
        # both the fastest and the least likely to be challenged. It cannot see
        # "made for kids" videos, hence the fallbacks below.
        YtdlpStrategy(
            name="android_vr",
            youtube_args={"player_client": ["android_vr"]},
        ),
        # The iOS client's formats are gated behind a GVS PO token, but the gate
        # lifts when a player token is present and the formats are usable often
        # enough to be worth trying before we reach for heavier machinery.
        YtdlpStrategy(
            name="ios",
            youtube_args={
                "player_client": ["ios"],
                "formats": ["missing_pot"],
            },
        ),
    ]

    if _pot_provider_available():
        # With a provider we can mint real PO tokens, which unlocks the web and
        # TV clients: the ones YouTube itself considers first-class.
        strategies.append(
            YtdlpStrategy(
                name="web_safari+pot",
                youtube_args={
                    "player_client": ["web_safari"],
                    "fetch_pot": ["always"],
                },
            )
        )
        strategies.append(
            YtdlpStrategy(
                name="tv_simply+pot",
                youtube_args={
                    "player_client": ["tv_simply"],
                    "fetch_pot": ["always"],
                },
            )
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
        # Last resort: same clients, different exit IP. Our address is the thing
        # YouTube rate limits, so changing it is the one lever that always helps.
        strategies.append(
            YtdlpStrategy(
                name="android_vr+proxy",
                youtube_args={"player_client": ["android_vr"]},
                use_proxy=True,
            )
        )
        strategies.append(
            YtdlpStrategy(
                name="ios+proxy",
                youtube_args={
                    "player_client": ["ios"],
                    "formats": ["missing_pot"],
                },
                use_proxy=True,
            )
        )

    logger.debug(f"yt-dlp strategy ladder: {', '.join(s.name for s in strategies)}")
    return strategies
