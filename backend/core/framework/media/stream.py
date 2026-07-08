import os
import json
import asyncio
from typing import Any
from logging import Logger

from fastapi.responses import StreamingResponse

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

logger: Logger = getLogger(name=__name__)

CHUNK_SIZE: int = 1024 * 1024


class MediaStream:
    @staticmethod
    async def stream_audio_from_video_async(
        video_path: str, range_header: str | None
    ) -> AResult[StreamingResponse]:
        """Stream the audio track of a video file as mp3 using ffmpeg with seeking support.

        The audio is transcoded on the fly. When a `range_header` is provided the
        requested byte range is mapped to a time range (estimated from a fixed bitrate)
        so seeking works without probing exact byte offsets.
        """

        if not os.path.exists(video_path):
            logger.warning(f"Video file not found on disk: {video_path}")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Video file not found on disk"
            )

        a_result_duration: AResult[float] = await MediaStream._probe_duration_async(
            video_path=video_path
        )
        if a_result_duration.is_not_ok():
            logger.error(f"Error probing duration. {a_result_duration.info()}")
            return AResult(
                code=a_result_duration.code(), message=a_result_duration.message()
            )

        duration: float = a_result_duration.result()

        bitrate: str = "192k"
        bitrate_bps: int = 192000
        estimated_size: int = int(duration * bitrate_bps / 8)

        if range_header:
            range_start: int = 0
            range_end: int = estimated_size - 1
            if "bytes=" in range_header:
                parts: list[str] = range_header.split("bytes=")[1].split("-")
                if parts[0]:
                    range_start = int(parts[0])
                if parts[1]:
                    range_end = int(parts[1])

            start_time: float = range_start / (bitrate_bps / 8)
            end_time: float = range_end / (bitrate_bps / 8)

            async def iter_range(time_start: float, time_end: float):
                process = await asyncio.create_subprocess_exec(
                    "ffmpeg",
                    "-ss",
                    str(time_start),
                    "-i",
                    video_path,
                    "-to",
                    str(time_end),
                    "-f",
                    "mp3",
                    "-acodec",
                    "libmp3lame",
                    "-b:a",
                    bitrate,
                    "-vn",
                    "-",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                stdout = process.stdout
                if stdout is None:
                    process.kill()
                    await process.wait()
                    return
                try:
                    while True:
                        chunk: bytes = await stdout.read(CHUNK_SIZE)
                        if not chunk:
                            break
                        yield chunk
                finally:
                    process.kill()
                    await process.wait()

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=StreamingResponse(
                    iter_range(start_time, min(end_time, duration)),
                    status_code=206,
                    media_type="audio/mpeg",
                    headers={
                        "Content-Range": f"bytes {range_start}-{range_end}/{estimated_size}",
                        "Accept-Ranges": "bytes",
                    },
                ),
            )

        async def iter_full():
            process = await asyncio.create_subprocess_exec(
                "ffmpeg",
                "-i",
                video_path,
                "-f",
                "mp3",
                "-acodec",
                "libmp3lame",
                "-b:a",
                bitrate,
                "-vn",
                "-",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            stdout = process.stdout
            if stdout is None:
                process.kill()
                await process.wait()
                return
            try:
                while True:
                    chunk: bytes = await stdout.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    yield chunk
            finally:
                process.kill()
                await process.wait()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=StreamingResponse(
                iter_full(),
                media_type="audio/mpeg",
                headers={
                    "Accept-Ranges": "bytes",
                },
            ),
        )

    @staticmethod
    async def _probe_duration_async(video_path: str) -> AResult[float]:
        """Probe the duration of a media file in seconds using ffprobe."""

        try:
            ffprobe = await asyncio.create_subprocess_exec(
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                video_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            ffprobe_stdout, _ = await ffprobe.communicate()
            duration_data: dict[str, Any] = json.loads(ffprobe_stdout)
            duration: float = float(duration_data["format"]["duration"])
        except Exception:
            logger.error(f"Error probing duration for {video_path}.", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error probing media duration"
            )

        return AResult(code=AResultCode.OK, message="OK", result=duration)
