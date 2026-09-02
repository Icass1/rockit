import asyncio
import json
import urllib.error
import urllib.request
from importlib import metadata
from importlib import util
from typing import Any

from backend.constants import YTDLP_POT_PROVIDER_URL

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

logger = getLogger(__name__)

_PING_TIMEOUT_SECONDS: float = 10.0

_PLUGIN_DISTRIBUTION: str = "bgutil-ytdlp-pot-provider"
_PLUGIN_MODULE: str = "yt_dlp_plugins.extractor.getpot_bgutil_http"


class PotProvider:
    """Startup checks for the bgutil proof-of-origin token provider.

    A misconfigured provider is invisible at runtime: yt-dlp reports
    "Requested format is not available" for the clients that need a token,
    which looks exactly like YouTube refusing us. These checks turn that into
    one startup error naming the actual cause.
    """

    @staticmethod
    def _plugin_version() -> str | None:
        """Return the installed plugin version, None when it is not installed."""

        try:
            return metadata.version(_PLUGIN_DISTRIBUTION)
        except metadata.PackageNotFoundError:
            return None

    @staticmethod
    def _is_plugin_discoverable() -> bool:
        """Whether the plugin sits where yt-dlp looks for provider plugins."""

        try:
            return util.find_spec(_PLUGIN_MODULE) is not None
        except (ImportError, ValueError):
            return False

    @staticmethod
    def _ping(base_url: str) -> tuple[bool, str]:
        """Ping the provider synchronously. Returns (reachable, version or error)."""

        url: str = f"{base_url.rstrip('/')}/ping"
        try:
            with urllib.request.urlopen(url, timeout=_PING_TIMEOUT_SECONDS) as response:
                raw: str = response.read().decode("utf-8")
                body: dict[str, Any] = json.loads(raw)
                return True, str(body.get("version", "unknown"))
        except urllib.error.URLError as e:
            return False, f"{e.__class__.__name__}: {e.reason}"
        except Exception as e:
            return False, f"{e.__class__.__name__}: {e}"

    @staticmethod
    async def check_health_async() -> AResult[str]:
        """Verify the PO token provider is installed, reachable and version matched."""

        base_url: str | None = YTDLP_POT_PROVIDER_URL
        if not base_url:
            logger.warning(
                "YTDLP_POT_PROVIDER_URL is not set. Downloads will only use the "
                "PO-token-free clients, which cover a fraction of the music "
                "catalogue. See docs/YOUTUBE_DOWNLOADS.md"
            )
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="PO token provider not configured",
            )

        plugin_version: str | None = PotProvider._plugin_version()
        if plugin_version is None or not PotProvider._is_plugin_discoverable():
            logger.error(
                f"YTDLP_POT_PROVIDER_URL is set but the '{_PLUGIN_DISTRIBUTION}' "
                f"yt-dlp plugin is not installed, so no PO token can ever be "
                f"fetched and every PO-token strategy will fail with 'Requested "
                f"format is not available'. Rebuild the backend image so "
                f"requirements.txt is reinstalled"
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="PO token plugin not installed",
            )

        loop: asyncio.AbstractEventLoop = asyncio.get_event_loop()
        reachable: bool
        detail: str
        reachable, detail = await loop.run_in_executor(
            None, lambda: PotProvider._ping(base_url=base_url)
        )

        if not reachable:
            logger.error(
                f"PO token provider at {base_url} is unreachable ({detail}). "
                f"Downloads will fall back to the PO-token-free clients. Check "
                f"that the pot-provider service is running and on the same "
                f"docker network as the backend"
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"PO token provider unreachable: {detail}",
            )

        if detail.split(".", 1)[0] != plugin_version.split(".", 1)[0]:
            logger.error(
                f"PO token provider major version mismatch: plugin is "
                f"{plugin_version}, server at {base_url} is {detail}. The plugin "
                f"refuses to use a mismatched server, so no PO token will be "
                f"fetched. Pin both to the same version"
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"PO token version mismatch: {plugin_version} vs {detail}",
            )

        if detail != plugin_version:
            logger.warning(
                f"PO token provider version differs from the plugin (plugin "
                f"{plugin_version}, server {detail}). Pin both to the same "
                f"version in requirements.txt and docker-compose.yml"
            )

        logger.info(
            f"PO token provider ready at {base_url} "
            f"(plugin {plugin_version}, server {detail})"
        )
        return AResult(code=AResultCode.OK, message="OK", result=detail)
