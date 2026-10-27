"""Compare legacy ZIP copying with export tags, using synthetic local data.

Run from the repository root:
PYTHONPATH=. python apps/backend/tests/performance/zip_export_benchmark.py

Measures packaging only, with warm filesystem caches; excludes DB and HTTP.
"""

import json
import statistics
import tempfile
import time
import zipfile
from pathlib import Path

from PIL import Image

from zipExport.models.exportFile import AudioTags, ExportFile
from zipExport.utils.archive import build_archive


def main() -> None:
    """Alternate both paths; never touch library files or deployment settings."""
    with tempfile.TemporaryDirectory(prefix="rockit-zip-benchmark-") as directory:
        root = Path(directory)
        source = root / "source.mp3"
        # Tagless payload: the export path writes ID3 without decoding the audio.
        source.write_bytes(b"x" * (8 * 1024 * 1024))
        cover = root / "cover.png"
        Image.effect_noise((1200, 1200), 80).convert("RGB").save(cover)
        metadata = AudioTags(artists=("Artist",), album="Album", track=1, cover_path=str(cover))
        files = [ExportFile(f"Track {index}", str(source), metadata) for index in range(32)]
        output = root / "export.zip"
        samples: dict[str, list[float]] = {"legacy": [], "copy": [], "tagged": []}
        for run in range(6):
            for mode in (
                ("legacy", "copy", "tagged") if run % 2 == 0 else ("tagged", "copy", "legacy")
            ):
                start = time.perf_counter()
                if mode == "legacy":
                    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_STORED) as archive:
                        for item in files:
                            archive.write(item.path, f"{item.name}.mp3")
                else:
                    build_archive(
                        zip_path=str(output),
                        files=(
                            files
                            if mode == "tagged"
                            else [ExportFile(item.name, item.path) for item in files]
                        ),
                        max_bytes=2 * 1024**3,
                    )
                elapsed = time.perf_counter() - start
                if run:
                    samples[mode].append(elapsed)
                output.unlink()
        medians = {key: round(statistics.median(value), 4) for key, value in samples.items()}
        print(
            json.dumps(
                {
                    "source_mib": 256,
                    "tracks": 32,
                    "cover_bytes": cover.stat().st_size,
                    "median_seconds": medians,
                    "copy_speedup": round(medians["legacy"] / medians["copy"], 2),
                    "tagged_speedup": round(medians["legacy"] / medians["tagged"], 2),
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    main()
