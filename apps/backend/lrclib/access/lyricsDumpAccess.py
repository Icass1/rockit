"""Read current lyrics from both legacy and Lyricsfile-enabled LRCLIB dumps."""

import aiosqlite

from logger import getLogger
from lrclib.models.api import LyricsResponse
from result import Result, ResultCode

logger = getLogger(__name__)


class LyricsDumpAccess:
    @staticmethod
    async def has_lyricsfile_async(db: aiosqlite.Connection) -> Result[bool]:
        try:
            async with db.execute("PRAGMA table_info(lyrics)") as cursor:
                columns = await cursor.fetchall()
            return Result(
                code=ResultCode.OK,
                message="OK",
                result=any(row[1] == "lyricsfile" for row in columns),
            )
        except aiosqlite.Error as exc:
            logger.error("Cannot inspect LRCLIB dump: %s", exc)
            return Result(code=ResultCode.GENERAL_ERROR, message="Cannot inspect LRCLIB dump")

    @staticmethod
    async def find_candidates_async(
        db: aiosqlite.Connection,
        track_name: str,
        artist_name: str,
        album_name: str,
        duration_s: float,
        include_lyricsfile: bool,
    ) -> Result[list[LyricsResponse]]:
        file_column = "l.lyricsfile" if include_lyricsfile else "NULL"
        try:
            async with db.execute(
                f"""
                SELECT t.id, l.plain_lyrics, l.synced_lyrics, {file_column}, t.duration
                FROM tracks t JOIN lyrics l ON l.id = t.last_lyrics_id
                WHERE t.name_lower = ? AND t.artist_name_lower = ? AND t.album_name_lower = ?
                  AND ABS(t.duration - ?) <= 2
                ORDER BY ABS(t.duration - ?), t.id LIMIT 100
                """,
                (
                    track_name.lower(),
                    artist_name.lower(),
                    album_name.lower(),
                    duration_s,
                    duration_s,
                ),
            ) as cursor:
                rows = await cursor.fetchall()
            records = [
                LyricsResponse(
                    id=row[0],
                    trackName=track_name,
                    artistName=artist_name,
                    albumName=album_name,
                    plainLyrics=row[1],
                    syncedLyrics=row[2],
                    lyricsfile=row[3],
                    duration=row[4],
                )
                for row in rows
            ]
            return Result(code=ResultCode.OK, message="OK", result=records)
        except (aiosqlite.Error, ValueError) as exc:
            logger.error("Cannot read LRCLIB dump: %s", exc)
            return Result(code=ResultCode.GENERAL_ERROR, message="Cannot read LRCLIB dump")
