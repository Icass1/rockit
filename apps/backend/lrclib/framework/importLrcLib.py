from dataclasses import dataclass
from logging import Logger

import aiosqlite
from sqlalchemy.ext.asyncio import AsyncSession

from logger import getLogger
from lrclib.access.lyricsAccess import LyricsAccess
from lrclib.access.lyricsDumpAccess import LyricsDumpAccess
from lrclib.framework.lrclib import Lrclib
from lrclib.framework.lyricsLookup import choose_candidate
from result import Result, ResultCode

logger: Logger = getLogger(__name__)

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
        file_support = await LyricsDumpAccess.has_lyricsfile_async(db=db)
        if file_support.is_not_ok():
            logger.error("Cannot import lyrics: %s", file_support.info())
            return
        for i in range(0, len(tracks_to_process), BATCH_SIZE):
            batch = tracks_to_process[i : i + BATCH_SIZE]

            for track in batch:
                a_result = await _process_track_async(
                    db=db, session=session, track=track, include_lyricsfile=file_support.result()
                )
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
    include_lyricsfile: bool = False,
) -> Result[bool]:
    """Process a single Spotify track: find match in LRCLIB and import lyrics."""

    duration_s: float = track.duration_ms / 1000.0

    candidates = await LyricsDumpAccess.find_candidates_async(
        db=db,
        track_name=track.name,
        artist_name=track.artist_name,
        album_name=track.album_name,
        duration_s=duration_s,
        include_lyricsfile=include_lyricsfile,
    )
    if candidates.is_not_ok():
        logger.warning("Cannot match dump lyrics: %s", candidates.info())
        return Result(code=candidates.code(), message=candidates.message())
    match = choose_candidate(
        records=candidates.result(),
        artist=track.artist_name,
        title=track.name,
        album=track.album_name,
        duration=duration_s,
        allow_relaxed=False,
    )
    if match is None:
        return Result(code=ResultCode.NOT_FOUND, message="No match in LRCLIB")
    parsed = Lrclib.parse_lyrics(parsed=match)
    if parsed.is_not_ok():
        logger.warning("Cannot parse dump lyrics: %s", parsed.info())
        return Result(code=parsed.code(), message=parsed.message())
    lines, dynamic = parsed.result()

    save_result = await LyricsAccess.save_lyrics_async(
        session=session,
        media_id=track.id,
        lyrics=lines,
        dynamic_lyrics=dynamic.lines if dynamic else None,
        offset=dynamic.offset if dynamic else 0,
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
