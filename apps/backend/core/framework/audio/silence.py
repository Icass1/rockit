"""Bounded, non-destructive file analysis shared by all media providers."""

import asyncio
import fcntl
import hashlib
import json
import math
import os
import time
from collections.abc import Coroutine
from pathlib import Path
from typing import Any, BinaryIO

from config import settings
from constants import TEMP_PATH
from core.responses.audioBoundsResponse import AudioBoundsResponse
from logger import getLogger

logger = getLogger(__name__)
VERSION = "edges-v1-60db-500ms-150ms"
WINDOW = 20.0
MARGIN = 0.15
_tasks: set[asyncio.Task[None]] = set()


def _identity(path: Path, source_id: str | None = None) -> str:
    """Invalidate results when a source or analysis parameters change."""
    info = path.stat()
    if not path.is_file():
        raise OSError("Not a regular file")
    value = (
        f"{source_id or path.resolve()}:{info.st_size}:{info.st_mtime_ns}:{info.st_ino}:{VERSION}"
    )
    return hashlib.sha256(value.encode()).hexdigest()


def _read_cache(cache: Path) -> AudioBoundsResponse | None:
    """Treat missing, corrupt or expired failure entries as cache misses."""
    try:
        data = json.loads(cache.read_text())
        result = AudioBoundsResponse.model_validate(data["bounds"])
        if result.status == "ready" or time.time() - data["created"] < 60:
            return result
    except (OSError, ValueError, KeyError, TypeError):
        pass
    return None


async def _run(*args: str) -> bytes:
    """Bound output, lifetime and reap children even during shutdown."""
    process = await asyncio.create_subprocess_exec(
        "nice",
        "-n",
        "10",
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
        limit=8 * 1024 * 1024,
    )
    try:
        assert process.stdout is not None
        async with asyncio.timeout(15):
            output = bytearray()
            while chunk := await process.stdout.read(65536):
                output.extend(chunk)
                if len(output) > 8 * 1024 * 1024:
                    raise ValueError("Analysis output limit exceeded")
            if await process.wait() != 0:
                raise ValueError("Audio decoder failed")
            return bytes(output)
    finally:
        if process.returncode is None:
            process.kill()
            await process.wait()


async def analyze(path: Path) -> AudioBoundsResponse:
    """Inspect at most 20 seconds at either edge, preserving soft audio in any channel."""
    import array

    probe = json.loads(
        (
            await _run(
                "ffprobe",
                "-v",
                "error",
                "-protocol_whitelist",
                "file",
                "-show_entries",
                "format=duration:stream=codec_type,channels",
                "-of",
                "json",
                f"file:{path}",
            )
        ).decode()
    )
    duration = float(probe["format"]["duration"])
    audio = next((s for s in probe["streams"] if s["codec_type"] == "audio"), None)
    if audio is None:
        return AudioBoundsResponse()
    channels = int(audio["channels"])
    if not math.isfinite(duration) or duration < 2 or channels not in (1, 2):
        return AudioBoundsResponse()
    size = min(WINDOW, duration)
    edges: list[float] = []
    for index, offset in enumerate((0.0, max(0.0, duration - size))):
        pcm = await _run(
            "ffmpeg",
            "-nostdin",
            "-v",
            "error",
            "-threads",
            "1",
            "-filter_threads",
            "1",
            "-protocol_whitelist",
            "file",
            "-ss",
            str(offset),
            "-i",
            f"file:{path}",
            "-t",
            str(size),
            "-map",
            "0:a:0",
            "-vn",
            "-sn",
            "-dn",
            "-ar",
            "48000",
            "-acodec",
            "pcm_f32le",
            "-f",
            "f32le",
            "pipe:1",
        )

        def active_blocks() -> tuple[list[int], int]:
            samples = array.array("f")
            samples.frombytes(pcm)
            import sys

            if sys.byteorder != "little":
                samples.byteswap()
            block = 480 * channels  # 10 ms, all channels and audible frequencies
            peaks = [
                max((abs(x) for x in samples[i : i + block]), default=0)
                for i in range(0, len(samples), block)
            ]
            return [i for i, peak in enumerate(peaks) if peak > 0.001], len(peaks)

        active, count = await asyncio.to_thread(active_blocks)
        # Unknown/silent whole window: never guess beyond this bounded observation.
        if not active or count < size * 100 - 10:
            return AudioBoundsResponse()
        edge = active[0] / 100 if index == 0 else (count - 1 - active[-1]) / 100
        edges.append(edge if edge >= 0.5 else 0)
    start = max(0.0, edges[0] - MARGIN)
    end = min(duration, duration - edges[1] + MARGIN)
    if end - start < 1:
        return AudioBoundsResponse()
    return AudioBoundsResponse(status="ready", start=start, end=end, duration=duration)


def _publish(path: Path, root: Path, key: str, bounds: AudioBoundsResponse) -> None:
    """Publish atomically only for the source we actually analyzed; bound disk cache."""
    if _identity(path=path) != key:
        return
    bounds.fingerprint = key
    target = root / f"{key}.json"
    temporary = root / f"{key}.tmp"
    temporary.write_text(json.dumps({"created": time.time(), "bounds": bounds.model_dump()}))
    temporary.replace(target)
    # One writer owns the slot; retain at most 2048 tiny metadata entries.
    entries = sorted(root.glob("*.json"), key=lambda item: item.stat().st_mtime)
    for item in entries[:-2048]:
        item.unlink(missing_ok=True)


async def _worker(path: Path, root: Path, key: str, lock: BinaryIO) -> None:
    """Own the host slot across API workers and release it on every exit path."""
    bounds = AudioBoundsResponse()
    try:
        bounds = await analyze(path=path)
    except TimeoutError:
        logger.warning("Boundary analysis timed out")
    except (OSError, ValueError, KeyError):
        logger.warning("Boundary analysis unavailable", exc_info=True)
    finally:
        try:
            await asyncio.to_thread(_publish, path=path, root=root, key=key, bounds=bounds)
        except OSError:
            logger.warning("Could not persist audio boundaries", exc_info=True)
        finally:
            lock.close()


async def _worker_s3(key: str, cache_key: str, root: Path, lock: BinaryIO) -> None:
    """Download an S3 source temporarily, analyze it, and publish stable metadata."""
    from core.framework.objectFiles import ObjectFiles

    bounds = AudioBoundsResponse()
    try:
        async with ObjectFiles.local_copy_async(key) as local_path:
            source = Path(local_path)
            bounds = await analyze(path=source)
        metadata = await asyncio.to_thread(ObjectFiles.metadata, key)
        current_identity = (
            f"s3://{metadata.get('Bucket', settings.S3_BUCKET)}/{key}:"
            f"{metadata.get('ETag', '')}:{metadata.get('ContentLength', '')}"
        )
        current_key = hashlib.sha256(f"{current_identity}:{VERSION}".encode()).hexdigest()
        if current_key != cache_key:
            return
        bounds.fingerprint = cache_key
        cache = root / f"{cache_key}.json"
        temporary = root / f"{cache_key}.tmp"
        temporary.write_text(json.dumps({"created": time.time(), "bounds": bounds.model_dump()}))
        temporary.replace(cache)
    except TimeoutError:
        logger.warning("Boundary analysis timed out")
    except (OSError, ValueError, KeyError):
        logger.warning("Boundary analysis unavailable", exc_info=True)
    except Exception:
        logger.exception("Could not analyze S3 audio boundaries")
    finally:
        lock.close()


async def request_bounds(path: str | None) -> AudioBoundsResponse:
    """Return immediately; a busy host has no pending queue and clients may retry."""
    if not path:
        return AudioBoundsResponse()
    root = Path(TEMP_PATH) / ".audio-boundaries"
    try:
        local_source: Path | None = None
        s3_key: str | None = None
        if os.path.isabs(path):
            source = Path(path).absolute()
            cache_key = await asyncio.to_thread(_identity, source)
            local_source = source
        else:
            from core.framework.objectFiles import ObjectFiles

            s3_key = ObjectFiles.key(path)
            metadata = await asyncio.to_thread(ObjectFiles.metadata, s3_key)
            source_identity = (
                f"s3://{metadata.get('Bucket', settings.S3_BUCKET)}/{s3_key}:"
                f"{metadata.get('ETag', '')}:{metadata.get('ContentLength', '')}"
            )
            cache_key = hashlib.sha256(f"{source_identity}:{VERSION}".encode()).hexdigest()

        cache = root / f"{cache_key}.json"
        cached = await asyncio.to_thread(_read_cache, cache=cache)
        if cached is not None:
            return cached
        await asyncio.to_thread(root.mkdir, parents=True, exist_ok=True)
        lock = (root / "worker.lock").open("ab")
        try:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            lock.close()
            return AudioBoundsResponse(status="pending")
        cached = await asyncio.to_thread(_read_cache, cache=cache)
        if cached is not None:
            lock.close()
            return cached
        worker_coro: Coroutine[Any, Any, None]
        if local_source is not None:
            worker_coro = _worker(local_source, root, cache_key, lock)
        else:
            assert s3_key is not None
            worker_coro = _worker_s3(s3_key, cache_key, root, lock)
        task: asyncio.Task[None] = asyncio.create_task(worker_coro)
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)
    except (OSError, ValueError):
        logger.warning("Could not access audio analysis cache", exc_info=True)
        return AudioBoundsResponse()
    except Exception:
        logger.exception("Could not resolve audio analysis source")
        return AudioBoundsResponse()
    return AudioBoundsResponse(status="pending")


async def shutdown_bounds() -> None:
    """Cancel analysis on host shutdown, reaping children before releasing file locks."""
    tasks = list(_tasks)
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
