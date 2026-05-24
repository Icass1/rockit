from logging import Logger
from typing import Dict, List, Tuple, cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id

from backend.core.aResult import AResult, AResultCode

from backend.core.models.lyrics import DynamicLyrics, DynamicLyricsData, Lyrics

from backend.lrclib.access.db.ormModels.lyricsRow import LyricsRow
from backend.lrclib.access.db.ormModels.lyricsLineRow import LyricsLineRow
from backend.lrclib.access.db.ormModels.dynamicLyricsLineRow import (
    DynamicLyricsLineRow,
)

logger: Logger = getLogger(__name__)


class LyricsAccess:
    @staticmethod
    async def get_lyrics_by_media_ids_async(
        session: AsyncSession, media_ids: list[int]
    ) -> AResult[Dict[int, Tuple[str, List[Lyrics] | None, DynamicLyricsData | None]]]:
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
            rows: List[LyricsRow] = cast(List[LyricsRow], result.scalars().all())

            result_map: Dict[
                int, Tuple[str, List[Lyrics] | None, DynamicLyricsData | None]
            ] = {}
            for row in rows:
                plain_lines: List[Lyrics] | None = None
                if row.lines:
                    plain_lines = [
                        Lyrics(text=l.text)
                        for l in sorted(row.lines, key=lambda x: x.line_number)
                    ]

                dynamic_data: DynamicLyricsData | None = None
                if row.dynamic_lines:
                    dynamic_lines = [
                        DynamicLyrics(
                            text=l.text,
                            timestamp_s=l.timestamp_s,
                        )
                        for l in sorted(row.dynamic_lines, key=lambda x: x.line_number)
                    ]
                    dynamic_data = DynamicLyricsData(
                        public_id=row.public_id,
                        lines=dynamic_lines,
                        offset=row.offset,
                    )

                result_map[row.media_id] = (row.public_id, plain_lines, dynamic_data)

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=result_map,
            )

        except Exception as e:
            logger.error(f"Error getting lyrics by media IDs: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting lyrics from database",
            )

    @staticmethod
    async def save_lyrics_async(
        session: AsyncSession,
        media_id: int,
        lyrics: List[Lyrics] | None,
        dynamic_lyrics: List[DynamicLyrics] | None,
        offset: float = 0.0,
    ) -> AResult[str]:
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

            return AResult(
                code=AResultCode.OK,
                message="Lyrics saved successfully",
                result=lyrics_row.public_id,
            )

        except Exception as e:
            logger.error(f"Error saving lyrics: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error saving lyrics to database",
            )

    @staticmethod
    async def update_dynamic_lyrics_timestamp_async(
        session: AsyncSession,
        media_id: int,
        line_number: int,
        new_timestamp_s: float,
    ) -> AResult[bool]:
        """Update the timestamp of a specific dynamic lyrics line."""

        try:
            lyrics_stmt = select(LyricsRow).where(LyricsRow.media_id == media_id)
            lyrics_result = await session.execute(lyrics_stmt)
            lyrics_row: LyricsRow | None = lyrics_result.scalar_one_or_none()

            if lyrics_row is None:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Lyrics not found for this media",
                )

            line_stmt = select(DynamicLyricsLineRow).where(
                DynamicLyricsLineRow.lyrics_id == lyrics_row.id,
                DynamicLyricsLineRow.line_number == line_number,
            )
            line_result = await session.execute(line_stmt)
            line_row: DynamicLyricsLineRow | None = line_result.scalar_one_or_none()

            if line_row is None:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"Dynamic lyrics line {line_number} not found",
                )

            line_row.timestamp_s = new_timestamp_s
            await session.flush()

            return AResult(
                code=AResultCode.OK,
                message="Timestamp updated successfully",
                result=True,
            )

        except Exception as e:
            logger.error(f"Error updating timestamp: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error updating timestamp",
            )
