import asyncio
import re
import httpx
from logging import Logger
from typing import List, Tuple, TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.models.lyrics import DynamicLyrics, Lyrics
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.framework.media.media import Media
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse

from backend.lrclib.models.api import LyricsResponse
from backend.lrclib.access.lyricsAccess import LyricsAccess

if TYPE_CHECKING:
    from backend.lrclib.framework.provider.lrclibProvider import LrclibProvider

logger: Logger = getLogger(__name__)


class Lrclib:
    provider: "LrclibProvider"
    provider_name: str

    @staticmethod
    async def get_lyrics_by_media_ids_async(
        session: AsyncSession, media_ids: List[int]
    ) -> AResult[dict[int, Tuple[List[Lyrics] | None, List[DynamicLyrics] | None]]]:
        """Get lyrics for multiple media IDs. Checks DB first, then fetches missing from API."""

        a_result_db = await LyricsAccess.get_lyrics_by_media_ids_async(
            session=session, media_ids=media_ids
        )

        result_map: dict[
            int, Tuple[List[Lyrics] | None, List[DynamicLyrics] | None]
        ] = {}
        missing_media_ids: List[int] = []

        if a_result_db.is_ok():
            db_results = a_result_db.result()
            for media_id in media_ids:
                if media_id in db_results and (
                    db_results[media_id][0] is not None
                    or db_results[media_id][1] is not None
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

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=result_map,
        )

    @staticmethod
    async def _fetch_and_save_lyrics_batch_async(
        session: AsyncSession,
        media_ids: List[int],
    ) -> AResult[dict[int, Tuple[List[Lyrics] | None, List[DynamicLyrics] | None]]]:
        """Fetch lyrics from API for media IDs not in the database, save them, and return."""

        a_result_medias: AResult[List[CoreMediaRow]] = (
            await MediaAccess.get_medias_from_ids_async(session=session, ids=media_ids)
        )
        if a_result_medias.is_not_ok():
            return AResult(
                code=a_result_medias.code(),
                message=a_result_medias.message(),
            )

        medias: List[CoreMediaRow] = a_result_medias.result()
        media_map: dict[int, CoreMediaRow] = {m.id: m for m in medias}

        async def fetch_one(
            media_id: int,
        ) -> Tuple[
            int, AResult[Tuple[List[Lyrics] | None, List[DynamicLyrics] | None]]
        ]:
            media_row = media_map.get(media_id)
            if media_row is None:
                logger.error(f"Media {media_id} not found.")
                return media_id, AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"Media {media_id} not found",
                )

            a_result_song: AResult[BaseSongWithAlbumResponse] = (
                await Media.get_song_async(
                    session=session, public_id=media_row.public_id
                )
            )
            if a_result_song.is_not_ok():
                logger.error(
                    f"Error getting song for media {media_id}. {a_result_song.info()}"
                )
                return media_id, AResult(
                    code=a_result_song.code(), message=a_result_song.message()
                )

            song: BaseSongWithAlbumResponse = a_result_song.result()

            artist_name: str = song.artists[0].name
            track_name: str = song.name
            album_name: str = song.album.name
            duration: float = song.duration_ms / 1000

            a_result_lyrics = await Lrclib.fetch_lyrics(
                artist_name=artist_name,
                track_name=track_name,
                album_name=album_name,
                duration=duration,
            )
            return media_id, a_result_lyrics

        tasks = [asyncio.create_task(fetch_one(mid)) for mid in media_ids]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        fetched_map: dict[
            int, Tuple[List[Lyrics] | None, List[DynamicLyrics] | None]
        ] = {}

        for media_id, a_result in results:
            if a_result.is_not_ok():
                logger.error(
                    f"Error fetching lyrics for media {media_id}. {a_result.info()}"
                )
                continue

            lyrics, dynamic_lyrics = a_result.result()

            save_result = await LyricsAccess.save_lyrics_async(
                session=session,
                media_id=media_id,
                lyrics=lyrics,
                dynamic_lyrics=dynamic_lyrics,
            )
            if save_result.is_not_ok():
                logger.error(
                    f"Error saving lyrics for media {media_id}. {save_result.info()}"
                )

            fetched_map[media_id] = (lyrics, dynamic_lyrics)

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=fetched_map,
        )

    @staticmethod
    async def fetch_lyrics(
        artist_name: str, track_name: str, album_name: str, duration: float
    ) -> AResult[Tuple[List[Lyrics] | None, List[DynamicLyrics] | None]]:
        """Get lyrics for the given media IDs.

        Args:
            artist_name (str): Artist name.
            track_name (str): Track name.
            album_name (str): Album name.
            duration (int): Duration of the track in seconds.

        Example:
            https://lrclib.net/api/get?artist_name=twenty%20one%20pilots&track_name=The%20Hype&album_name=TRENCH&duration=265
        """

        request_url = "https://lrclib.net/api/get"

        params = {
            "artist_name": artist_name,
            "track_name": track_name,
            "album_name": album_name,
            "duration": str(duration),
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(request_url, params=params, timeout=10)
                response.raise_for_status()
        except httpx.HTTPError as e:
            logger.error(f"Error while making request to Lrclib {params=}: {e}")
            return AResult[Tuple[List[Lyrics] | None, List[DynamicLyrics] | None]](
                code=AResultCode.GENERAL_ERROR,
                message=f"Error while making request to Lrclib: {e}",
            )

        content = response.json()

        parsed: LyricsResponse = LyricsResponse.model_validate(content)

        lyrics: List[Lyrics] | None = None
        dynamicLyrics: List[DynamicLyrics] | None = None

        if parsed.plainLyrics:
            lyrics = []
            for line in parsed.plainLyrics.split("\n"):
                lyrics.append(Lyrics(text=line))
        else:
            logger.warning(f"No plain lyrics found for {params=}")

        if parsed.syncedLyrics:
            dynamicLyrics = []
            for line in parsed.syncedLyrics.split("\n"):
                a_result_parsed = Lrclib.parse_timestamp(line)

                if a_result_parsed.is_not_ok():
                    logger.error("Error getting timestamp from line.")
                    continue

                timestamp_s, clean_text = a_result_parsed.result()

                dynamicLyrics.append(
                    DynamicLyrics(
                        text=clean_text,
                        timestamp_s=timestamp_s,
                    )
                )
        else:
            logger.warning(f"No synced lyrics found for {params=}")

        return AResult[Tuple[List[Lyrics] | None, List[DynamicLyrics] | None]](
            code=AResultCode.OK,
            message="Lyrics retrieved successfully.",
            result=(lyrics, dynamicLyrics),
        )

    @staticmethod
    def parse_timestamp(line: str) -> AResult[Tuple[float, str]]:
        """
        Parses a line and returns the timestamp and the clean text.
        Example: line="[00:15.72] My interior world needs to sanitize"
        Returns: (15.72, "My interior world needs to sanitize")
        """

        match = re.search(r"\[(\d+):(\d+\.\d+)\]", line)

        if match:
            minutes = int(match.group(1))
            seconds = float(match.group(2))
            total_seconds = minutes * 60 + seconds
            clean_text = line[match.end() :].strip()
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=(total_seconds, clean_text),
            )
        else:
            logger.error(f"Unable to get timestamp from {line}.")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Unable to get timestamp from {line}.",
            )

    @staticmethod
    async def update_dynamic_lyrics_timestamps_async(
        session: AsyncSession,
        media_id: int,
        timestamps: List[Tuple[int, float]],
    ) -> AResult[bool]:
        """Update timestamps for specific lines of dynamic lyrics."""

        for line_number, new_timestamp_s in timestamps:
            a_result = await LyricsAccess.update_dynamic_lyrics_timestamp_async(
                session=session,
                media_id=media_id,
                line_number=line_number,
                new_timestamp_s=new_timestamp_s,
            )
            if a_result.is_not_ok():
                return a_result

        return AResult(code=AResultCode.OK, message="Timestamps updated", result=True)
