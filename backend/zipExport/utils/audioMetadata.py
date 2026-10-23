"""Write export-only tags without transcoding or modifying library files."""

import io
from typing import BinaryIO

from mutagen.id3 import (
    ID3,
    ID3NoHeaderError,
    APIC,
    TIT2,
    TPE1,
    TPE2,
    TALB,
    TDRC,
    TRCK,
    TPOS,
    TSRC,
)
from PIL import Image

from backend.utils.logger import getLogger
from backend.zipExport.models.exportFile import AudioTags

logger = getLogger(name=__name__)
MAX_COVER_BYTES = 16 * 1024 * 1024


def read_cover(path: str) -> tuple[bytes, str] | None:
    """Use original artwork pixels and JPEG/PNG bytes, never UI thumbnails."""
    if not path:
        return None
    try:
        with open(file=path, mode="rb") as source:
            data = source.read(MAX_COVER_BYTES + 1)
        if len(data) > MAX_COVER_BYTES:
            logger.warning(f"Cover exceeds export artwork limit: {path}")
            return None
        with Image.open(io.BytesIO(data)) as image:
            if image.format in ("JPEG", "PNG"):
                image.verify()
                return data, "image/jpeg" if image.format == "JPEG" else "image/png"
            output = io.BytesIO()
            image.convert("RGB").save(output, format="JPEG", quality=95)
            return output.getvalue(), "image/jpeg"
    except (
        OSError,
        ValueError,
        SyntaxError,
        Image.DecompressionBombError,
    ) as exception:
        logger.warning(f"Could not read export cover {path}: {exception}")
        return None


def apply_id3(
    tags: ID3, title: str, metadata: AudioTags, cover: tuple[bytes, str] | None
) -> None:
    """Replace known library fields, preserving existing fields absent in the DB."""
    values = (
        ("TIT2", TIT2, [title]),
        ("TPE1", TPE1, metadata.artists),
        ("TALB", TALB, [metadata.album] if metadata.album else []),
        ("TPE2", TPE2, metadata.album_artists),
        ("TDRC", TDRC, [metadata.date] if metadata.date else []),
        ("TRCK", TRCK, [str(metadata.track)] if metadata.track > 0 else []),
        ("TPOS", TPOS, [str(metadata.disc)] if metadata.disc > 0 else []),
        ("TSRC", TSRC, [metadata.isrc] if metadata.isrc else []),
    )
    for key, frame, value in values:
        if value:
            tags.delall(key)  # pyright: ignore[reportUnknownMemberType]
            tags.add(  # pyright: ignore[reportUnknownMemberType]
                frame(encoding=3, text=list(value))
            )
    if cover is not None:
        data, mime = cover
        tags.delall("APIC")  # pyright: ignore[reportUnknownMemberType]
        tags.add(  # pyright: ignore[reportUnknownMemberType]
            APIC(encoding=3, mime=mime, type=3, desc="Cover", data=data)
        )


def _no_padding(info: object) -> int:
    """Archive tags need no reserved space for later in-place edits."""
    return 0


def mp3_header(
    source: BinaryIO, title: str, metadata: AudioTags, cover: tuple[bytes, str] | None
) -> bytes:
    """Replace only the ID3 prefix; leave the source positioned at MPEG data."""
    try:
        tags = ID3(fileobj=source)
        offset = tags.size
    except ID3NoHeaderError:
        tags = ID3()
        offset = 0
    apply_id3(tags=tags, title=title, metadata=metadata, cover=cover)
    output = io.BytesIO()
    # ID3v2.3 is understood by older desktop/car players as well as modern apps.
    tags.save(  # pyright: ignore[reportUnknownMemberType]
        output, v2_version=3, padding=_no_padding
    )
    source.seek(offset)
    return output.getvalue()
