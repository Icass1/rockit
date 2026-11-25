import os
import re
import shutil
import zipfile
from contextlib import ExitStack
from typing import BinaryIO

from core.framework.objectFiles import ObjectFiles
from logger import getLogger
from zipExport.models.exportFile import ExportFile
from zipExport.utils.audioMetadata import mp3_header

logger = getLogger(name=__name__)


def safe_export_name(value: str) -> str:
    """Strip path separators and reserved characters from an archive entry name."""

    return re.sub(r'[\\/:*?"<>|]', "_", value).strip() or "media"


class ArchiveTooLarge(Exception):
    """The final archive, including embedded artwork, exceeds the export budget."""


def build_archive(zip_path: str, files: list[ExportFile], max_bytes: int) -> int:
    """Copy media once with bounded buffers, off the event loop and without encoding."""
    total_bytes = 0
    for item in files:
        try:
            total_bytes += int(ObjectFiles.metadata(item.key)["ContentLength"])
        except FileNotFoundError:
            continue
    if total_bytes > max_bytes:
        raise ArchiveTooLarge()
    used_names: set[str] = set()
    written = 0
    # A per-export cache avoids rereading the same album cover for each song.
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED) as archive:
        for item in files:
            with ExitStack() as processing:
                try:
                    source = processing.enter_context(ObjectFiles.open_file(item.key))
                except FileNotFoundError:
                    logger.warning(f"Skipping missing file while zipping. {item.key}")
                    continue
                archive_name = f"{safe_export_name(item.name)}{os.path.splitext(item.key)[1]}"
                stem, extension = os.path.splitext(archive_name)
                suffix = 2
                while archive_name in used_names:
                    archive_name = f"{stem} ({suffix}){extension}"
                    suffix += 1
                used_names.add(archive_name)
                header = _audio_header(source=source, item=item, extension=extension)
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


def _audio_header(source: BinaryIO, item: ExportFile, extension: str) -> bytes:
    if item.tags is None or extension.lower() != ".mp3":
        return b""
    try:
        cover = (
            (item.tags.cover_data, item.tags.cover_mime)
            if item.tags.cover_data is not None
            else None
        )
        return mp3_header(source=source, title=item.name, metadata=item.tags, cover=cover)
    except Exception as exception:
        logger.warning(f"Could not tag export {item.key}: {exception}")
        source.seek(0)
        return b""


def build_single_file(path: str, item: ExportFile, max_bytes: int) -> int:
    """Use the ZIP tagging path for one audio file, without wrapping it in an archive."""
    if int(ObjectFiles.metadata(item.key)["ContentLength"]) > max_bytes:
        raise ArchiveTooLarge()
    with ObjectFiles.open_file(item.key) as source:
        header = _audio_header(source=source, item=item, extension=os.path.splitext(item.key)[1])
        if len(header) + os.fstat(source.fileno()).st_size - source.tell() > max_bytes:
            raise ArchiveTooLarge()
        with open(path, "wb") as target:
            target.write(header)
            shutil.copyfileobj(fsrc=source, fdst=target, length=1024 * 1024)
    if os.path.getsize(path) > max_bytes:
        raise ArchiveTooLarge()
    return 1
