import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from importlib import metadata, util
from typing import Any

from constants import YTDLP_POT_PROVIDER_URL
from logger import getLogger
from result import Result, ResultCode
from youtube.utils.ytdlpLog import sanitize_ytdlp_message

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

    _last_check_at: float = 0.0
    _last_result: Result[str] | None = None

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
    async def _check_provider_async() -> Result[str]:
        """Verify the PO token provider is installed, reachable and version matched."""

        base_url: str | None = YTDLP_POT_PROVIDER_URL
        if not base_url:
            logger.warning(
                "YTDLP_POT_PROVIDER_URL is not set. Downloads will only use the "
                "PO-token-free clients, which cover a fraction of the music "
                "catalogue. See docs/YOUTUBE_DOWNLOADS.md"
            )
            return Result(
                code=ResultCode.OK,
                message="Using fallback clients without PO tokens",
                result="disabled",
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
            return Result(
                code=ResultCode.CONFIGURATION_ERROR,
                message="PO token plugin not installed",
            )

        loop: asyncio.AbstractEventLoop = asyncio.get_event_loop()
        reachable: bool
        detail: str
        reachable, detail = await loop.run_in_executor(
            None, lambda: PotProvider._ping(base_url=base_url)
        )

        detail = sanitize_ytdlp_message(message=detail)
        if not reachable:
            logger.error(
                f"PO token provider at [configured endpoint] is unreachable ({detail}). "
                f"Configured token-backed downloads will retry later. Check "
                f"that the pot-provider service is running and on the same "
                f"docker network as the backend"
            )
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"PO token provider unreachable: {detail}",
            )

        if detail.split(".", 1)[0] != plugin_version.split(".", 1)[0]:
            logger.error(
                f"PO token provider major version mismatch: plugin is "
                f"{plugin_version}, server at [configured endpoint] is {detail}. The plugin "
                f"refuses to use a mismatched server, so no PO token will be "
                f"fetched. Pin both to the same version"
            )
            return Result(
                code=ResultCode.CONFIGURATION_ERROR,
                message=f"PO token version mismatch: {plugin_version} vs {detail}",
            )

        if detail != plugin_version:
            logger.warning(
                f"PO token provider version differs from the plugin (plugin "
                f"{plugin_version}, server {detail}). Pin both to the same "
                f"version in requirements.txt and docker-compose.yml"
            )

        logger.info(
            f"PO token provider ready at [configured endpoint] "
            f"(plugin {plugin_version}, server {detail})"
        )
        return Result(code=ResultCode.OK, message="OK", result=detail)

    @staticmethod
    async def check_health_async(max_age_seconds: float = 0.0) -> Result[str]:
        """Check runtime prerequisites and cache readiness briefly between downloads."""

        if (
            PotProvider._last_result is not None
            and time.monotonic() - PotProvider._last_check_at < max_age_seconds
        ):
            return PotProvider._last_result

        versions: dict[str, str] = {}
        for package in ("yt-dlp", "yt-dlp-ejs", _PLUGIN_DISTRIBUTION):
            try:
                versions[package] = metadata.version(package)
            except metadata.PackageNotFoundError:
                versions[package] = "missing"
        logger.info(
            f"YouTube downloader build revision: {os.getenv('ROCKIT_BUILD_REVISION', 'unknown')}"
        )
        logger.info(f"YouTube downloader dependency versions: {versions}")
        node = shutil.which("node")
        node_version = "missing"
        if node:
            try:
                process = await asyncio.to_thread(
                    subprocess.run,
                    [node, "--version"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if process.returncode == 0:
                    node_version = process.stdout.strip()
            except (OSError, subprocess.TimeoutExpired):
                logger.warning("Could not determine Node.js runtime version")
        logger.info(f"YouTube downloader Node.js version: {node_version}")
        try:
            node_major = int(node_version.lstrip("v").split(".")[0])
        except ValueError:
            node_major = 0
        if node_major < 22 or versions["yt-dlp-ejs"] == "missing":
            logger.error(
                "YouTube downloads require Node.js >=22 and the pinned "
                "yt-dlp-ejs package; rebuild the backend"
            )
            result = Result[str](
                code=ResultCode.CONFIGURATION_ERROR,
                message="YouTube runtime or EJS package missing; rebuild the backend",
            )
        else:
            result = await PotProvider._check_provider_async()
        PotProvider._last_result = result
        PotProvider._last_check_at = time.monotonic()
        return result
