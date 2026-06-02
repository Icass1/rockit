import aiosqlite
from dataclasses import dataclass
from logging import Logger
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.models.lyrics import DynamicLyrics, Lyrics
from backend.lrclib.access.lyricsAccess import LyricsAccess
from backend.lrclib.access.db.ormModels.lyricsRow import LyricsRow
from backend.lrclib.framework.lrclib import Lrclib

logger: Logger = getLogger(__name__)

DURATION_TOLERANCE: float = 2.0
BATCH_SIZE: int = 500


@dataclass
class TrackInfo:
    id: int
    name: str
    artist_name: str
    album_name: str
    duration_ms: int


async def import_lrc_lib_from_dump_async(
    sqlite_path: str, session: AsyncSession
) -> None:
    """Import lyrics from LRCLIB SQLite dump into PostgreSQL lrclib schema."""

    logger.info("Fetching Spotify tracks from PostgreSQL...")

    rows = await session.execute(
        text("""
            SELECT DISTINCT ON (t.id)
                t.id,
                t.name,
                t.duration_ms,
                al.name AS album_name,
                a.name AS artist_name
            FROM spotify.track t
            JOIN spotify.album al ON al.id = t.album_id
            JOIN spotify.track_artist ta ON ta.track_id = t.id
            JOIN spotify.artist a ON a.id = ta.artist_id
            ORDER BY t.id, ta.artist_id
        """)
    )
    tracks: List[TrackInfo] = [
        TrackInfo(id=r[0], name=r[1], duration_ms=r[2], album_name=r[3], artist_name=r[4])
        for r in rows
    ]
    logger.info(f"Found {len(tracks)} Spotify tracks")

    all_media_ids: List[int] = [t.id for t in tracks]

    existing_stmt = select(LyricsRow.media_id).where(
        LyricsRow.media_id.in_(all_media_ids)
    )
    existing_result = await session.execute(existing_stmt)
    existing_media_ids: Set[int] = set(existing_result.scalars().all())
    logger.info(f"{len(existing_media_ids)} tracks already have lyrics, will skip")

    tracks_to_process = [t for t in tracks if t.id not in existing_media_ids]
    logger.info(f"Processing {len(tracks_to_process)} tracks")

    imported: int = 0
    no_match: int = 0
    errors: int = 0

    async with aiosqlite.connect(sqlite_path) as db:
        for i in range(0, len(tracks_to_process), BATCH_SIZE):
            batch = tracks_to_process[i : i + BATCH_SIZE]

            for track in batch:
                a_result = await _process_track_async(
                    db=db, session=session, track=track
                )
                if a_result.is_ok():
                    imported += 1
                elif a_result.code() == AResultCode.NOT_FOUND:
                    no_match += 1
                else:
                    errors += 1

            await session.commit()

            batch_num = i // BATCH_SIZE + 1
            total_batches = (
                len(tracks_to_process) + BATCH_SIZE - 1
            ) // BATCH_SIZE
            logger.info(
                f"Batch {batch_num}/{total_batches}: "
                f"imported={imported}, no_match={no_match}, errors={errors} "
                f"({i + len(batch)}/{len(tracks_to_process)} tracks)"
            )

    logger.info(
        f"Import complete: {imported} imported, {no_match} not found in LRCLIB, "
        f"{errors} errors"
    )


async def _process_track_async(
    db: aiosqlite.Connection,
    session: AsyncSession,
    track: TrackInfo,
) -> AResult[bool]:
    """Process a single Spotify track: find match in LRCLIB and import lyrics."""

    duration_s: float = track.duration_ms / 1000.0

    match: Optional[Tuple[Optional[str], Optional[str]]] = await _find_match_async(
        db=db,
        track_name=track.name,
        artist_name=track.artist_name,
        album_name=track.album_name,
        duration_s=duration_s,
    )

    if match is None:
        return AResult(code=AResultCode.NOT_FOUND, message="No match in LRCLIB")

    plain_lyrics_raw, synced_lyrics_raw = match

    lines: Optional[List[Lyrics]] = None
    if plain_lyrics_raw:
        lines = [Lyrics(text=line) for line in plain_lyrics_raw.split("\n")]

    dynamic_lines: Optional[List[DynamicLyrics]] = None
    if synced_lyrics_raw:
        dynamic_lines = []
        for sync_line in synced_lyrics_raw.split("\n"):
            sync_line = sync_line.strip()
            if not sync_line:
                continue
            a_parsed = Lrclib.parse_timestamp(sync_line)
            if a_parsed.is_ok():
                timestamp_s, text = a_parsed.result()
                dynamic_lines.append(
                    DynamicLyrics(text=text, timestamp_s=timestamp_s)
                )

    save_result = await LyricsAccess.save_lyrics_async(
        session=session,
        media_id=track.id,
        lyrics=lines,
        dynamic_lyrics=dynamic_lines if dynamic_lines else None,
    )

    if save_result.is_not_ok():
        logger.error(
            f"Error saving lyrics for track {track.id} ({track.name}): "
            f"{save_result.message()}"
        )
        return AResult(
            code=AResultCode.GENERAL_ERROR,
            message=save_result.message(),
        )

    return AResult(code=AResultCode.OK, message="OK", result=True)


async def _find_match_async(
    db: aiosqlite.Connection,
    track_name: str,
    artist_name: str,
    album_name: str,
    duration_s: float,
) -> Optional[Tuple[Optional[str], Optional[str]]]:
    """Find best matching track in LRCLIB SQLite dump.

    Matches by name, artist, album (case-insensitive) and duration (±tolerance).
    Picks the match with closest duration if multiple are found.
    Returns (plain_lyrics, synced_lyrics) or None.
    """

    cursor = await db.execute(
        """
        SELECT l.plain_lyrics, l.synced_lyrics, t.duration
        FROM tracks t
        JOIN lyrics l ON l.track_id = t.id
        WHERE t.name_lower = ?
          AND t.artist_name_lower = ?
          AND t.album_name_lower = ?
          AND ABS(t.duration - ?) <= ?
        ORDER BY ABS(t.duration - ?) ASC
        LIMIT 1
        """,
        (
            track_name.lower(),
            artist_name.lower(),
            album_name.lower(),
            duration_s,
            DURATION_TOLERANCE,
            duration_s,
        ),
    )
    row = await cursor.fetchone()
    await cursor.close()

    if row is None:
        return None

    plain_lyrics: Optional[str] = row[0]
    synced_lyrics: Optional[str] = row[1]
    return (plain_lyrics, synced_lyrics)
