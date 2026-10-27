from dataclasses import dataclass
from logging import Logger

import aiosqlite
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.lyrics import DynamicLyrics, Lyrics
from logger import getLogger
from lrclib.access.lyricsAccess import LyricsAccess
from lrclib.framework.lrclib import Lrclib
from result import Result, ResultCode

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


async def import_lrc_lib_from_dump_async(sqlite_path: str, session: AsyncSession) -> None:
    """Import lyrics from LRCLIB SQLite dump into PostgreSQL lrclib schema."""

    logger.info("Fetching Spotify tracks from PostgreSQL...")

    a_result_tracks = await LyricsAccess.get_spotify_tracks_for_lyrics_import_async(session=session)
    if a_result_tracks.is_not_ok():
        logger.error(f"Error fetching tracks: {a_result_tracks.info()}")
        return

    tracks: list[TrackInfo] = [
        TrackInfo(id=r[0], name=r[1], duration_ms=r[2], album_name=r[3], artist_name=r[4])
        for r in a_result_tracks.result()
    ]
    logger.info(f"Found {len(tracks)} Spotify tracks")

    all_media_ids: list[int] = [t.id for t in tracks]

    a_result_existing: Result[set[int]] = await LyricsAccess.get_existing_lyrics_media_ids_async(
        session=session, media_ids=all_media_ids
    )
    existing_media_ids: set[int] = (
        a_result_existing.result() if a_result_existing.is_ok() else set()
    )
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
                a_result = await _process_track_async(db=db, session=session, track=track)
                if a_result.is_ok():
                    imported += 1
                elif a_result.code() == ResultCode.NOT_FOUND:
                    no_match += 1
                else:
                    errors += 1

            await LyricsAccess.commit_async(session=session)

            batch_num = i // BATCH_SIZE + 1
            total_batches = (len(tracks_to_process) + BATCH_SIZE - 1) // BATCH_SIZE
            logger.info(
                f"Batch {batch_num}/{total_batches}: "
                f"imported={imported}, no_match={no_match}, errors={errors} "
                f"({i + len(batch)}/{len(tracks_to_process)} tracks)"
            )

    logger.info(
        f"Import complete: {imported} imported, {no_match} not found in LRCLIB, {errors} errors"
    )


async def _process_track_async(
    db: aiosqlite.Connection,
    session: AsyncSession,
    track: TrackInfo,
) -> Result[bool]:
    """Process a single Spotify track: find match in LRCLIB and import lyrics."""

    duration_s: float = track.duration_ms / 1000.0

    match: tuple[str | None, str | None] | None = await _find_match_async(
        db=db,
        track_name=track.name,
        artist_name=track.artist_name,
        album_name=track.album_name,
        duration_s=duration_s,
    )

    if match is None:
        return Result(code=ResultCode.NOT_FOUND, message="No match in LRCLIB")

    plain_lyrics_raw, synced_lyrics_raw = match

    lines: list[Lyrics] | None = None
    if plain_lyrics_raw:
        lines = [Lyrics(text=line) for line in plain_lyrics_raw.split("\n")]

    dynamic_lines: list[DynamicLyrics] | None = None
    if synced_lyrics_raw:
        dynamic_lines = []
        for sync_line in synced_lyrics_raw.split("\n"):
            sync_line = sync_line.strip()
            if not sync_line:
                continue
            a_parsed = Lrclib.parse_timestamp(sync_line)
            if a_parsed.is_ok():
                timestamp_s, text = a_parsed.result()
                dynamic_lines.append(DynamicLyrics(text=text, timestamp_s=timestamp_s))

    save_result = await LyricsAccess.save_lyrics_async(
        session=session,
        media_id=track.id,
        lyrics=lines,
        dynamic_lyrics=dynamic_lines if dynamic_lines else None,
    )

    if save_result.is_not_ok():
        logger.error(
            f"Error saving lyrics for track {track.id} ({track.name}): {save_result.message()}"
        )
        return Result(
            code=ResultCode.GENERAL_ERROR,
            message=save_result.message(),
        )

    return Result(code=ResultCode.OK, message="OK", result=True)


async def _find_match_async(
    db: aiosqlite.Connection,
    track_name: str,
    artist_name: str,
    album_name: str,
    duration_s: float,
) -> tuple[str | None, str | None] | None:
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

    plain_lyrics: str | None = row[0]
    synced_lyrics: str | None = row[1]
    return (plain_lyrics, synced_lyrics)
