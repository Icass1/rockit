"""Run with python -m backend.youtube.diagnose inside the deployed backend."""

import asyncio
import argparse
import json
import tempfile
import subprocess
from pathlib import Path

from yt_dlp import YoutubeDL

from backend.utils.logger import getLogger
from backend.youtube.framework.potProvider import PotProvider
from backend.youtube.framework.ytdlpOptions import build_download_opts
from backend.youtube.framework.ytdlpStrategies import build_strategies
from backend.youtube.utils.ytdlpLog import sanitize_ytdlp_message

logger = getLogger(__name__)


async def diagnose_async(
    url: str, format_type: str, download: bool, strategy_name: str
) -> int:
    """Exercise one configured strategy without creating application download rows."""

    health = await PotProvider.check_health_async()
    if health.is_not_ok():
        logger.error(health.message())
        return 1
    strategy = next(
        (item for item in build_strategies() if item.name == strategy_name), None
    )
    if strategy is None:
        logger.error(
            "Requested strategy is not configured; check YTDLP_POT_PROVIDER_URL"
        )
        return 1
    with tempfile.TemporaryDirectory(prefix="rockit-youtube-check-") as directory:
        base = build_download_opts(
            format_type=format_type,
            output_template=str(Path(directory) / "check.%(ext)s"),
        )
        base["skip_download"] = not download
        opts = strategy.build_opts(base_opts=base)
        try:
            with YoutubeDL(opts) as ydl:  # type: ignore[arg-type]
                code = await asyncio.to_thread(ydl.download, [url])
            if code not in (None, 0):
                logger.error("yt-dlp returned a failed download status")
                return 1
            if download:
                output = Path(directory) / f"check.{format_type}"
                if not output.is_file():
                    logger.error("Expected output is missing")
                    return 1
                probe = await asyncio.to_thread(
                    subprocess.run,
                    [
                        "ffprobe",
                        "-v",
                        "error",
                        "-show_entries",
                        "format=duration:stream=codec_type,codec_name",
                        "-of",
                        "json",
                        str(output),
                    ],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if probe.returncode != 0:
                    logger.error("ffprobe could not validate the downloaded output")
                    return 1
                media = json.loads(probe.stdout)
                streams = {stream["codec_type"] for stream in media.get("streams", [])}
                expected = {"audio", "video"} if format_type == "mp4" else {"audio"}
                if (
                    float(media.get("format", {}).get("duration", 0)) <= 0
                    or not expected <= streams
                ):
                    logger.error(
                        "Downloaded output has no duration or is missing expected streams"
                    )
                    return 1
                logger.info(f"Full download validated: {media}")
            else:
                logger.info(
                    "Extraction passed; use --download to verify the full media transfer"
                )
            return 0
        except Exception as error:
            logger.error(sanitize_ytdlp_message(message=str(error)))
            return 1


def main() -> int:
    """Parse an explicit smoke check; full downloads use temporary files only."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--format", choices=("mp3", "mp4"), default="mp4")
    parser.add_argument("--strategy", default="mweb+pot")
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    return asyncio.run(
        diagnose_async(
            url=args.url,
            format_type=args.format,
            download=args.download,
            strategy_name=args.strategy,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
