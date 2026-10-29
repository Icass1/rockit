import os
import subprocess
from logging import Logger

from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


def extract_video_frame(full_video_path: str, public_id: str, timestamp_ms: float) -> Result[bytes]:
    """Extract a single frame from a video file at the given timestamp (ms).

    Args:
        full_video_path: Absolute path to the video file on disk.
        public_id: Public ID of the video (used for logging).
        timestamp_ms: Timestamp in milliseconds for the frame to extract.

    Returns:
        Result with WEBP image bytes, or an error.
    """

    if not os.path.exists(full_video_path):
        logger.error(f"Video file not found at {full_video_path}")
        return Result(
            code=ResultCode.NOT_FOUND,
            message="Video file not found on disk",
        )

    try:
        cmd: list[str] = [
            "ffmpeg",
            "-y",
            "-ss",
            str(timestamp_ms / 1000.0),
            "-i",
            full_video_path,
            "-vframes",
            "1",
            "-f",
            "image2pipe",
            "-c:v",
            "webp",
            "-lossless",
            "0",
            "-q:v",
            "80",
            "-",
        ]

        result: subprocess.CompletedProcess[bytes] = subprocess.run(
            cmd,
            capture_output=True,
            timeout=30,
        )

        if result.returncode != 0 or len(result.stdout) == 0:
            stderr: str = result.stderr.decode("utf-8", errors="replace")[:500]
            logger.error(
                f"Could not read frame at {timestamp_ms}ms from video {public_id}. "
                f"ffmpeg stderr: {stderr}"
            )
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Could not read frame from video",
            )

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=result.stdout,
        )

    except subprocess.TimeoutExpired:
        logger.error(f"ffmpeg timed out extracting frame from video {public_id}")
        return Result(
            code=ResultCode.GENERAL_ERROR,
            message="Timeout extracting frame from video",
        )

    except FileNotFoundError:
        logger.error("ffmpeg not found on system")
        return Result(
            code=ResultCode.GENERAL_ERROR,
            message="ffmpeg is not installed",
        )

    except Exception as e:
        logger.error(f"Error extracting frame from video {public_id}. {e}")
        return Result(
            code=ResultCode.GENERAL_ERROR,
            message=f"Error extracting frame: {e}",
        )
