from logging import Logger
from typing import cast

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.models.lyrics import DynamicLyrics, DynamicLyricsData, Lyrics
from core.utils.createId import create_id
from logger import getLogger
from lrclib.access.db.ormModels.dynamicLyricsLineRow import (
    DynamicLyricsLineRow,
)
from lrclib.access.db.ormModels.lyricsLineRow import LyricsLineRow
from lrclib.access.db.ormModels.lyricsRow import LyricsRow
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


class LyricsAccess:
    @staticmethod
    async def get_lyrics_by_media_ids_async(
        session: AsyncSession, media_ids: list[int]
    ) -> Result[dict[int, tuple[str, list[Lyrics] | None, DynamicLyricsData | None]]]:
        """Get lyrics for multiple media IDs from the database."""

        try:
            stmt = (
                select(LyricsRow)
                .where(LyricsRow.media_id.in_(media_ids))
                .options(
                    selectinload(LyricsRow.lines),
                    selectinload(LyricsRow.dynamic_lines),
                )
            )
            result = await session.execute(stmt)
            rows: list[LyricsRow] = cast(list[LyricsRow], result.scalars().all())

            result_map: dict[int, tuple[str, list[Lyrics] | None, DynamicLyricsData | None]] = {}
            for row in rows:
                plain_lines: list[Lyrics] | None = None
                if row.lines:
                    plain_lines = [
                        Lyrics(text=item_value.text)
                        for item_value in sorted(row.lines, key=lambda x: x.line_number)
                    ]

                dynamic_data: DynamicLyricsData | None = None
                if row.dynamic_lines:
                    dynamic_lines = [
                        DynamicLyrics(
                            text=item_value.text,
                            timestamp_s=item_value.timestamp_s,
                        )
                        for item_value in sorted(row.dynamic_lines, key=lambda x: x.line_number)
                    ]
                    dynamic_data = DynamicLyricsData(
                        public_id=row.public_id,
                        lines=dynamic_lines,
                        offset=row.offset,
                    )

                result_map[row.media_id] = (row.public_id, plain_lines, dynamic_data)

            return Result(
                code=ResultCode.OK,
                message="OK",
                result=result_map,
            )

        except Exception as e:
            logger.error(f"Error getting lyrics by media IDs: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting lyrics from database",
            )

    @staticmethod
    async def save_lyrics_async(
        session: AsyncSession,
        media_id: int,
        lyrics: list[Lyrics] | None,
        dynamic_lyrics: list[DynamicLyrics] | None,
        offset: float = 0.0,
    ) -> Result[str]:
        """Save lyrics for a media item to the database. Returns the lyrics public_id."""

        try:
            existing_stmt = (
                select(LyricsRow)
                .where(LyricsRow.media_id == media_id)
                .options(
                    selectinload(LyricsRow.lines),
                    selectinload(LyricsRow.dynamic_lines),
                )
            )
            existing_result = await session.execute(existing_stmt)
            existing: LyricsRow | None = existing_result.scalar_one_or_none()

            if existing:
                lyrics_row = existing
                lyrics_row.offset = offset
            else:
                lyrics_row = LyricsRow(
                    public_id=create_id(32),
                    media_id=media_id,
                    offset=offset,
                )
                session.add(lyrics_row)
                await session.flush()

            if lyrics is not None:
                if existing:
                    for old_line in lyrics_row.lines:
                        await session.delete(old_line)

                for i, line in enumerate(lyrics):
                    new_line = LyricsLineRow(
                        lyrics_id=lyrics_row.id,
                        line_number=i,
                        text=line.text,
                    )
                    session.add(new_line)

            if dynamic_lyrics is not None:
                if existing:
                    for old_line in lyrics_row.dynamic_lines:
                        await session.delete(old_line)

                for i, line in enumerate(dynamic_lyrics):
                    new_line = DynamicLyricsLineRow(
                        lyrics_id=lyrics_row.id,
                        line_number=i,
                        text=line.text,
                        timestamp_s=round(line.timestamp_s, 2),
                    )
                    session.add(new_line)

            await session.flush()

            return Result(
                code=ResultCode.OK,
                message="Lyrics saved successfully",
                result=lyrics_row.public_id,
            )

        except Exception as e:
            logger.error(f"Error saving lyrics: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error saving lyrics to database",
            )

    @staticmethod
    async def update_dynamic_lyrics_timestamp_async(
        session: AsyncSession,
        media_id: int,
        line_number: int,
        new_timestamp_s: float,
    ) -> Result[bool]:
        """Update the timestamp of a specific dynamic lyrics line."""

        try:
            lyrics_stmt = select(LyricsRow).where(LyricsRow.media_id == media_id)
            lyrics_result = await session.execute(lyrics_stmt)
            lyrics_row: LyricsRow | None = lyrics_result.scalar_one_or_none()

            if lyrics_row is None:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message="Lyrics not found for this media",
                )

            line_stmt = select(DynamicLyricsLineRow).where(
                DynamicLyricsLineRow.lyrics_id == lyrics_row.id,
                DynamicLyricsLineRow.line_number == line_number,
            )
            line_result = await session.execute(line_stmt)
            line_row: DynamicLyricsLineRow | None = line_result.scalar_one_or_none()

            if line_row is None:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"Dynamic lyrics line {line_number} not found",
                )

            line_row.timestamp_s = new_timestamp_s
            await session.flush()

            return Result(
                code=ResultCode.OK,
                message="Timestamp updated successfully",
                result=True,
            )

        except Exception as e:
            logger.error(f"Error updating timestamp: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error updating timestamp",
            )

    @staticmethod
    async def commit_async(
        session: AsyncSession,
    ) -> Result[bool]:
        """Commit the current session transaction."""

        try:
            await session.commit()
            return Result(code=ResultCode.OK, message="OK", result=True)
        except Exception as e:
            logger.error(f"Error committing session: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error committing session")

    @staticmethod
    async def get_spotify_tracks_for_lyrics_import_async(
        session: AsyncSession,
    ) -> Result[list[tuple[int, str, int, str, str]]]:
        """Get Spotify tracks with album and artist names for lyrics import."""

        try:
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
            result: list[tuple[int, str, int, str, str]] = [
                (r[0], r[1], r[2], r[3], r[4]) for r in rows
            ]
            return Result(code=ResultCode.OK, message="OK", result=result)
        except Exception as e:
            logger.error(f"Error getting spotify tracks: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting spotify tracks",
            )

    @staticmethod
    async def get_existing_lyrics_media_ids_async(
        session: AsyncSession,
        media_ids: list[int],
    ) -> Result[set[int]]:
        """Get set of media_ids that already have lyrics."""

        try:
            stmt = select(LyricsRow.media_id).where(LyricsRow.media_id.in_(media_ids))
            result = await session.execute(stmt)
            existing: set[int] = set(result.scalars().all())
            return Result(code=ResultCode.OK, message="OK", result=existing)
        except Exception as e:
            logger.error(f"Error getting existing lyrics: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting existing lyrics",
            )
