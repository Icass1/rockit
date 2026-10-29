import asyncio
import math
import re
from logging import Logger
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.media import CoreMediaRow
from core.access.mediaAccess import MediaAccess
from core.framework.media.media import Media
from core.models.lyrics import DynamicLyrics, DynamicLyricsData, Lyrics
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from logger import getLogger
from lrclib.access.lyricsAccess import LyricsAccess
from lrclib.framework.lyricsLookup import lookup_lyrics_async
from result import Result, ResultCode

if TYPE_CHECKING:
    from lrclib.framework.provider.lrclibProvider import LrclibProvider

logger: Logger = getLogger(__name__)


class Lrclib:
    provider: "LrclibProvider"
    provider_name: str

    @staticmethod
    async def get_lyrics_by_media_ids_async(
        session: AsyncSession, media_ids: list[int]
    ) -> Result[dict[int, tuple[str, list[Lyrics] | None, DynamicLyricsData | None]]]:
        """Get lyrics for multiple media IDs. Checks DB first, then fetches missing from API.
        Returns dict mapping media_id -> (lyrics_public_id, plain_lyrics, dynamic_lyrics_data).
        """

        a_result_db = await LyricsAccess.get_lyrics_by_media_ids_async(
            session=session, media_ids=media_ids
        )

        result_map: dict[int, tuple[str, list[Lyrics] | None, DynamicLyricsData | None]] = {}
        missing_media_ids: list[int] = []

        if a_result_db.is_ok():
            db_results = a_result_db.result()
            for media_id in media_ids:
                if media_id in db_results and (
                    db_results[media_id][1] is not None or db_results[media_id][2] is not None
                ):
                    result_map[media_id] = db_results[media_id]
                else:
                    missing_media_ids.append(media_id)
        else:
            missing_media_ids = list(media_ids)

        if missing_media_ids:
            a_result_fetched = await Lrclib._fetch_and_save_lyrics_batch_async(
                session=session, media_ids=missing_media_ids
            )
            if a_result_fetched.is_ok():
                for media_id, lyrics_data in a_result_fetched.result().items():
                    result_map[media_id] = lyrics_data

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=result_map,
        )

    @staticmethod
    async def _fetch_and_save_lyrics_batch_async(
        session: AsyncSession,
        media_ids: list[int],
    ) -> Result[dict[int, tuple[str, list[Lyrics] | None, DynamicLyricsData | None]]]:
        """Fetch lyrics from API for media IDs not in the database, save them, and return.
        Returns dict mapping media_id -> (lyrics_public_id, plain_lyrics, dynamic_lyrics_data).
        """

        a_result_medias: Result[list[CoreMediaRow]] = await MediaAccess.get_medias_from_ids_async(
            session=session, ids=media_ids
        )
        if a_result_medias.is_not_ok():
            return Result(
                code=a_result_medias.code(),
                message=a_result_medias.message(),
            )

        medias: list[CoreMediaRow] = a_result_medias.result()
        media_map: dict[int, CoreMediaRow] = {m.id: m for m in medias}

        async def fetch_one(
            media_id: int,
        ) -> tuple[
            int,
            Result[tuple[list[Lyrics] | None, DynamicLyricsData | None]],
        ]:
            media_row = media_map.get(media_id)
            if media_row is None:
                logger.error(f"Media {media_id} not found.")
                return media_id, Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"Media {media_id} not found",
                )

            a_result_song: Result[BaseSongWithAlbumResponse] = await Media.get_song_async(
                session=session, public_id=media_row.public_id
            )
            if a_result_song.is_not_ok():
                logger.warning(f"Song with id {media_id} not found. {a_result_song.info()}")
                return media_id, Result(code=a_result_song.code(), message=a_result_song.message())

            song: BaseSongWithAlbumResponse = a_result_song.result()

            if len(song.artists) == 0:
                logger.warning(f"Song {song.name} from {song.provider} doesn't have artists.")
                return media_id, Result[tuple[list[Lyrics] | None, DynamicLyricsData | None]](
                    code=ResultCode.BAD_REQUEST,
                    message=f"Song {song.name} from {song.provider} doesn't have artists.",
                )

            artist_name: str = song.artists[0].name if len(song.artists) > 0 else ""
            track_name: str = song.name
            album_name: str = song.album.name
            duration: float = song.duration_ms / 1000

            a_result_lyrics = await Lrclib.fetch_lyrics_async(
                artist_name=artist_name,
                track_name=track_name,
                album_name=album_name,
                duration=duration,
            )
            return media_id, a_result_lyrics

        tasks = [asyncio.create_task(fetch_one(mid)) for mid in media_ids]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        fetched_map: dict[int, tuple[str, list[Lyrics] | None, DynamicLyricsData | None]] = {}

        for media_id, a_result in results:
            if a_result.code() == ResultCode.NOT_FOUND:
                logger.warning(f"Lyrics for media {media_id}. {a_result.info()} not found.")
                continue

            if a_result.is_not_ok():
                logger.error(f"Error fetching lyrics for media {media_id}. {a_result.info()}")
                continue

            lyrics, dynamic_data = a_result.result()

            save_result = await LyricsAccess.save_lyrics_async(
                session=session,
                media_id=media_id,
                lyrics=lyrics,
                dynamic_lyrics=dynamic_data.lines if dynamic_data else None,
            )
            if save_result.is_not_ok():
                logger.error(f"Error saving lyrics for media {media_id}. {save_result.info()}")
                continue

            lyrics_public_id: str = save_result.result()

            if dynamic_data is not None:
                dynamic_data.public_id = lyrics_public_id

            fetched_map[media_id] = (lyrics_public_id, lyrics, dynamic_data)

        return Result(
            code=ResultCode.OK,
            message="OK",
            result=fetched_map,
        )

    @staticmethod
    async def fetch_lyrics_async(
        artist_name: str, track_name: str, album_name: str, duration: float
    ) -> Result[tuple[list[Lyrics] | None, DynamicLyricsData | None]]:
        """Get lyrics for the given media IDs.

        Args:
            artist_name (str): Artist name.
            track_name (str): Track name.
            album_name (str): Album name.
            duration (int): Duration of the track in seconds.

        Example:
            https://lrclib.net/api/get?artist_name=twenty%20one%20pilots&track_name=The%20Hype&album_name=TRENCH&duration=265
        """

        lookup = await lookup_lyrics_async(
            artist_name=artist_name,
            track_name=track_name,
            album_name=album_name,
            duration=duration,
        )
        if lookup.is_not_ok():
            logger.warning("Lyrics lookup failed: %s", lookup.info())
            return Result(code=lookup.code(), message=lookup.message())
        parsed = lookup.result()

        lyrics: list[Lyrics] | None = None
        dynamicLyrics: list[DynamicLyrics] | None = None

        if parsed.plainLyrics:
            lyrics = []
            for line in parsed.plainLyrics.split("\n"):
                lyrics.append(Lyrics(text=line))
        else:
            logger.warning(f"No plain lyrics found for {track_name}")

        if parsed.syncedLyrics:
            dynamicLyrics = []
            for line in parsed.syncedLyrics.split("\n"):
                a_result_parsed = Lrclib.parse_timestamp(line)

                if a_result_parsed.is_not_ok():
                    logger.error(f"Error getting timestamp from line. '{line}'")
                    continue

                timestamp_s, clean_text = a_result_parsed.result()

                dynamicLyrics.append(
                    DynamicLyrics(
                        text=clean_text,
                        timestamp_s=timestamp_s,
                    )
                )
        else:
            logger.warning(f"No synced lyrics found for {track_name}")

        if lyrics is None and dynamicLyrics:
            lyrics = [Lyrics(text=line.text) for line in dynamicLyrics]

        # Identity can recover plain text despite video-length metadata, but duration
        # disagreement cannot establish that published timestamps fit this recording.
        if not math.isfinite(duration) or duration <= 0 or abs(parsed.duration - duration) > 3:
            logger.warning("Keeping plain lyrics only: timing is unverified for %s", track_name)
            dynamicLyrics = None

        dynamic_data: DynamicLyricsData | None = (
            DynamicLyricsData(lines=dynamicLyrics) if dynamicLyrics else None
        )

        return Result[tuple[list[Lyrics] | None, DynamicLyricsData | None]](
            code=ResultCode.OK,
            message="Lyrics retrieved successfully.",
            result=(lyrics, dynamic_data),
        )

    @staticmethod
    def parse_timestamp(line: str) -> Result[tuple[float, str]]:
        """
        Parses a line and returns the timestamp and the clean text.
        Example: line="[00:15.72] My interior world needs to sanitize"
        Returns: (15.72, "My interior world needs to sanitize")
        """

        match = re.search(r"^\[(\d+):([0-5]\d(?:\.\d+)?)\]", line)

        if match:
            minutes = int(match.group(1))
            seconds = float(match.group(2))
            total_seconds = round(minutes * 60 + seconds, 2)
            clean_text = line[match.end() :].strip()
            return Result(
                code=ResultCode.OK,
                message="OK",
                result=(total_seconds, clean_text),
            )
        else:
            logger.error(f"Unable to get timestamp from {line}.")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Unable to get timestamp from {line}.",
            )

    @staticmethod
    async def update_dynamic_lyrics_timestamps_async(
        session: AsyncSession,
        media_id: int,
        timestamps: list[tuple[int, float]],
    ) -> Result[bool]:
        """Update timestamps for specific lines of dynamic lyrics."""

        for line_number, new_timestamp_s in timestamps:
            a_result = await LyricsAccess.update_dynamic_lyrics_timestamp_async(
                session=session,
                media_id=media_id,
                line_number=line_number,
                new_timestamp_s=round(new_timestamp_s, 2),
            )
            if a_result.is_not_ok():
                return a_result

        return Result(code=ResultCode.OK, message="Timestamps updated", result=True)
