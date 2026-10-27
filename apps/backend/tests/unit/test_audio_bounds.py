"""Boundary detection must preserve quiet music, stereo and internal pauses."""

import asyncio
import math
import shutil
import wave
from array import array
from pathlib import Path

import pytest

from core.framework.audio import silence

pytestmark = [
    pytest.mark.unit,
    pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg unavailable"),
]


@pytest.mark.parametrize(
    "mode", ["edges", "quiet", "antiphase", "one-channel", "internal", "silent"]
)
async def test_original_clock_boundaries(tmp_path: Path, mode: str) -> None:
    """Inspect real decoded PCM rather than fabricated detector output."""
    samples = array("h")
    for i in range(6 * 48000):
        t = i / 48000
        active = (
            1 <= t < 5
            if mode in ("edges", "antiphase", "one-channel")
            else not (mode == "internal" and 2 < t < 4)
        )
        gain = (
            0 if mode == "silent" or not active else (0.002 if mode == "quiet" else 0.2)
        )
        value = int(32767 * gain * math.sin(2 * math.pi * 440 * t))
        samples.extend(
            (
                value,
                (
                    -value
                    if mode == "antiphase"
                    else 0 if mode == "one-channel" else value
                ),
            )
        )
    path = tmp_path / "song.wav"
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(48000)
        output.writeframes(samples.tobytes())
    result = await silence.analyze(path=path)
    if mode == "silent":
        assert result.status == "unavailable"
    elif mode in ("edges", "antiphase", "one-channel"):
        assert result.status == "ready"
        assert result.start == pytest.approx(0.85, abs=0.03)
        assert result.end == pytest.approx(5.15, abs=0.03)
    else:
        assert result.start == 0
        assert result.end == pytest.approx(6)


async def test_shared_cache_slot_and_source_replacement(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Ten callers share a host slot; replacing a source invalidates its metadata."""
    from core.responses.audioBoundsResponse import AudioBoundsResponse

    source = tmp_path / "song.wav"
    source.write_bytes(b"first")
    monkeypatch.setattr(silence, "MEDIA_PATH", str(tmp_path))
    release = asyncio.Event()
    calls = 0

    async def analyze(path: Path) -> AudioBoundsResponse:
        nonlocal calls
        calls += 1
        await release.wait()
        return AudioBoundsResponse(status="ready", start=1, end=9, duration=10)

    monkeypatch.setattr(silence, "analyze", analyze)
    responses = await asyncio.gather(
        *(silence.request_bounds(path=str(source)) for _ in range(10))
    )
    assert all(item.status == "pending" for item in responses)

    async def wait_ready() -> None:
        for _ in range(100):
            if (await silence.request_bounds(path=str(source))).status == "ready":
                return
            await asyncio.sleep(0.01)
        pytest.fail("Boundary metadata did not become ready")

    release.set()
    await wait_ready()
    assert calls == 1
    assert (await silence.request_bounds(path=str(source))).status == "ready"
    source.write_bytes(b"replacement")
    assert (await silence.request_bounds(path=str(source))).status == "pending"
    await wait_ready()
    assert calls == 2
