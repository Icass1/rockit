import os
import re
import shutil
import zipfile
from functools import lru_cache

from logger import getLogger
from zipExport.models.exportFile import ExportFile
from zipExport.utils.audioMetadata import mp3_header, read_cover

logger = getLogger(name=__name__)


def _safe_name(value: str) -> str:
    """Strip path separators and reserved characters from an archive entry name."""

    return re.sub(r'[\\/:*?"<>|]', "_", value).strip() or "media"


class ArchiveTooLarge(Exception):
    """The final archive, including embedded artwork, exceeds the export budget."""


def build_archive(zip_path: str, files: list[ExportFile], max_bytes: int) -> int:
    """Copy media once with bounded buffers, off the event loop and without encoding."""
    total_bytes = 0
    for item in files:
        try:
            total_bytes += os.path.getsize(item.path)
        except FileNotFoundError:
            continue
    if total_bytes > max_bytes:
        raise ArchiveTooLarge()
    used_names: set[str] = set()
    written = 0
    # A per-export cache avoids rereading the same album cover for each song.
    cover_for = lru_cache(maxsize=8)(read_cover)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED) as archive:
        for item in files:
            try:
                source = open(file=item.path, mode="rb")
            except FileNotFoundError:
                logger.warning(f"Skipping missing file while zipping. {item.path}")
                continue
            with source:
                archive_name = f"{_safe_name(item.name)}{os.path.splitext(item.path)[1]}"
                stem, extension = os.path.splitext(archive_name)
                suffix = 2
                while archive_name in used_names:
                    archive_name = f"{stem} ({suffix}){extension}"
                    suffix += 1
                used_names.add(archive_name)
                header = b""
                if item.tags is not None and extension.lower() == ".mp3":
                    try:
                        cover = cover_for(item.tags.cover_path)
                        if item.tags.cover_data is not None:
                            cover = (item.tags.cover_data, item.tags.cover_mime)
                        header = mp3_header(
                            source=source,
                            title=item.name,
                            metadata=item.tags,
                            cover=cover,
                        )
                    except Exception as exception:
                        # A corrupt tag must not prevent downloading otherwise usable audio.
                        logger.warning(f"Could not tag export {item.path}: {exception}")
                        source.seek(0)
                remaining = os.fstat(source.fileno()).st_size - source.tell()
                if (
                    archive.fp is not None
                    and archive.fp.tell() + len(header) + remaining > max_bytes
                ):
                    raise ArchiveTooLarge()
                with archive.open(archive_name, "w", force_zip64=True) as target:
                    target.write(header)
                    shutil.copyfileobj(fsrc=source, fdst=target, length=1024 * 1024)
                written += 1
                if archive.fp is not None and archive.fp.tell() > max_bytes:
                    raise ArchiveTooLarge()
    if os.path.getsize(zip_path) > max_bytes:
        raise ArchiveTooLarge()
    return written
