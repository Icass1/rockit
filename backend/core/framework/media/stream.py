import os
import stat
import hashlib
import asyncio
import tempfile
from weakref import WeakValueDictionary
from collections.abc import AsyncIterator

import aiofiles
from fastapi.responses import StreamingResponse

from backend.constants import TEMP_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

logger = getLogger(name=__name__)
CHUNK_SIZE = 64 * 1024
_audio_locks: WeakValueDictionary[str, asyncio.Lock] = WeakValueDictionary()


class MediaStream:
    @staticmethod
    async def stream_audio_from_video_async(
        video_path: str, range_header: str | None
    ) -> AResult[StreamingResponse]:
        """Serve a stable MP3 representation with exact HTTP byte ranges.

        Safari probes bytes 0-1 before playback. Starting a fresh encoder at an
        estimated timestamp cannot satisfy that request or subsequent seeks.
        Cache the complete encoding and publish it atomically before serving.
        """
        a_result = await MediaStream._prepare_audio_async(video_path=video_path)
        if a_result.is_not_ok():
            logger.error(f"Error preparing video audio. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return await MediaStream.stream_audio_file_async(
            audio_path=a_result.result(), range_header=range_header
        )

    @staticmethod
    async def stream_audio_file_async(
        audio_path: str, range_header: str | None
    ) -> AResult[StreamingResponse]:
        """Stream an existing audio file in bounded chunks without making a copy."""
        try:
            file_stat = await asyncio.to_thread(os.stat, audio_path)
        except FileNotFoundError:
            logger.error("Audio file not found")
            return AResult(code=AResultCode.NOT_FOUND, message="Audio file not found")
        except OSError:
            logger.error("Could not inspect audio file", exc_info=True)
            return AResult(code=AResultCode.GENERAL_ERROR, message="Audio unavailable")
        if not stat.S_ISREG(file_stat.st_mode):
            logger.error("Audio path is not a regular file")
            return AResult(code=AResultCode.NOT_FOUND, message="Audio file not found")
        size = file_stat.st_size
        start, end = 0, size - 1
        status = 200
        headers = {"Accept-Ranges": "bytes"}
        if range_header:
            try:
                unit, value = range_header.split("=", 1)
                valid = unit.strip().lower() == "bytes" and "," not in value
                first, last = value.strip().split("-", 1)
                if first:
                    start = int(first)
                    end = min(int(last), size - 1) if last else size - 1
                else:
                    suffix = int(last)
                    valid = valid and suffix > 0
                    start = max(0, size - suffix)
                valid = valid and 0 <= start < size and start <= end
            except ValueError:
                valid = False
            if not valid:
                logger.warning("Invalid audio byte range requested")
                return AResult(
                    code=AResultCode.OK,
                    message="Range not satisfiable",
                    result=StreamingResponse(
                        content=iter(()),
                        status_code=416,
                        headers={
                            "Accept-Ranges": "bytes",
                            "Content-Range": f"bytes */{size}",
                            "Content-Length": "0",
                        },
                    ),
                )
            status = 206
            headers["Content-Range"] = f"bytes {start}-{end}/{size}"
        headers["Content-Length"] = str(end - start + 1)

        async def iter_audio() -> AsyncIterator[bytes]:
            async with aiofiles.open(file=audio_path, mode="rb") as audio:
                await audio.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk = await audio.read(min(CHUNK_SIZE, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=StreamingResponse(
                content=iter_audio(),
                status_code=status,
                media_type="audio/mpeg",
                headers=headers,
            ),
        )

    @staticmethod
    async def _prepare_audio_async(video_path: str) -> AResult[str]:
        """Serialize probes and seeks for one source without retaining idle locks."""
        source = os.path.abspath(video_path)
        lock = _audio_locks.setdefault(source, asyncio.Lock())
        async with lock:
            return await MediaStream._encode_audio_async(video_path=source)

    @staticmethod
    async def _encode_audio_async(video_path: str) -> AResult[str]:
        """Cache an encoding keyed by source identity, size and modification time."""
        temporary_path: str | None = None
        process: asyncio.subprocess.Process | None = None
        try:
            stat = os.stat(video_path)
            identity = (
                f"{os.path.abspath(video_path)}:{stat.st_size}:{stat.st_mtime_ns}"
            )
            key = hashlib.sha256(identity.encode()).hexdigest()
            directory = os.path.join(TEMP_PATH, "video-audio")
            os.makedirs(name=directory, exist_ok=True)
            audio_path = os.path.join(directory, f"{key}.mp3")
            if os.path.isfile(audio_path) and os.path.getsize(audio_path) > 0:
                return AResult(code=AResultCode.OK, message="OK", result=audio_path)

            # Separate temporary names also make concurrent worker processes safe.
            # Readers never observe a partially encoded representation.
            descriptor, temporary_path = tempfile.mkstemp(
                prefix=f"{key}-", suffix=".mp3", dir=directory
            )
            os.close(descriptor)
            process = await asyncio.create_subprocess_exec(
                "ffmpeg",
                "-nostdin",
                "-y",
                "-v",
                "error",
                "-i",
                video_path,
                "-map",
                "0:a:0",
                "-vn",
                "-codec:a",
                "libmp3lame",
                "-b:a",
                "192k",
                "-f",
                "mp3",
                temporary_path,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                await asyncio.wait_for(process.communicate(), timeout=600)
            except asyncio.TimeoutError:
                logger.error("Timed out preparing video audio")
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Audio preparation timed out",
                )
            if process.returncode != 0 or os.path.getsize(temporary_path) == 0:
                logger.error("ffmpeg could not prepare the video's audio track")
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Could not prepare video audio",
                )
            os.replace(src=temporary_path, dst=audio_path)
            temporary_path = None
            return AResult(code=AResultCode.OK, message="OK", result=audio_path)
        except FileNotFoundError:
            logger.error("Video file or ffmpeg executable not found", exc_info=True)
            return AResult(
                code=AResultCode.NOT_FOUND, message="Video file or encoder not found"
            )
        except Exception:
            logger.error("Error preparing video audio", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Could not prepare video audio"
            )
        finally:
            if process is not None and process.returncode is None:
                process.kill()
                await process.wait()
            if temporary_path is not None and os.path.exists(temporary_path):
                os.remove(path=temporary_path)
