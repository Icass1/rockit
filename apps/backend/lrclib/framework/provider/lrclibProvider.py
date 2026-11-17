import asyncio

import httpx
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.provider.baseLyricsProvider import BaseLyricsProvider
from core.models.lyrics import DynamicLyricsData, LyricsData
from core.models.lyricsCorrection import LyricsCorrectionLine
from core.models.lyricsSource import StoredLyricsSource
from logger import getLogger
from lrclib.access.lyricsAccess import LyricsAccess
from lrclib.framework.lrclib import Lrclib
from lrclib.models.api import LyricsResponse
from result import Result, ResultCode

logger = getLogger(__name__)


class LrclibProvider(BaseLyricsProvider):
    def set_info(self, provider_id: int, provider_name: str) -> None:
        Lrclib.provider_name = provider_name
        Lrclib.provider = self

        self._id = provider_id
        self._name = provider_name

    async def get_lyrics_source_async(self, source_id: int) -> Result[StoredLyricsSource]:
        """A fixed LRCLIB endpoint; resolving a suggestion never saves song lyrics."""
        if not 0 < source_id <= 9007199254740991:
            logger.warning("Invalid LRCLIB source ID")
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid LRCLIB ID")
        try:
            async with (
                asyncio.timeout(10),
                httpx.AsyncClient(
                    timeout=8, headers={"User-Agent": "Rockit (https://github.com/Icass1/rockit)"}
                ) as client,
            ):
                response = await client.get(url=f"https://lrclib.net/api/get/{source_id}")
            if response.status_code == 404:
                logger.warning("LRCLIB source not found: %s", source_id)
                return Result(code=ResultCode.NOT_FOUND, message="LRCLIB ID not found")
            response.raise_for_status()
            record = LyricsResponse.model_validate(response.json())
            if record.id != source_id or record.instrumental:
                logger.warning("LRCLIB source has no matching vocal lyrics")
                return Result(code=ResultCode.BAD_REQUEST, message="No vocal lyrics at this ID")
            parsed = Lrclib.parse_lyrics(parsed=record)
            if parsed.is_not_ok():
                logger.warning("Cannot parse LRCLIB source: %s", parsed.info())
                return Result(code=parsed.code(), message=parsed.message())
            plain, dynamic = parsed.result()
            lines = (
                [
                    LyricsCorrectionLine(text=line.text, timestamp_s=line.timestamp_s)
                    for line in dynamic.lines
                ]
                if dynamic
                else [LyricsCorrectionLine(text=line.text) for line in (plain or [])]
            )
            snapshot = StoredLyricsSource(
                kind="lyrics_source",
                provider="LRCLIB",
                sourceId=source_id,
                trackName=record.trackName,
                artistName=record.artistName,
                albumName=record.albumName,
                duration=record.duration,
                offset=dynamic.offset if dynamic else 0,
                lines=lines,
            )
            return Result(code=ResultCode.OK, message="OK", result=snapshot)
        except ValidationError as exc:
            logger.warning("Invalid LRCLIB source lyrics: %s", exc)
            return Result(code=ResultCode.BAD_REQUEST, message="No usable lyrics at this ID")
        except (TimeoutError, httpx.HTTPError, ValueError) as exc:
            logger.warning("LRCLIB source lookup failed: %s", exc)
            return Result(code=ResultCode.GENERAL_ERROR, message="LRCLIB temporarily unavailable")

    async def search_lyrics_async(
        self, session: AsyncSession, query: str, limit: int, media_type: str | None = None
    ) -> Result[dict[int, float]]:
        """Search cached lyrics without requesting remote lyrics or media."""
        return await LyricsAccess.search_async(
            session=session, query=query, limit=limit, media_type=media_type
        )

    async def get_lyrics_bundle_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> Result[dict[int, tuple[LyricsData | None, DynamicLyricsData | None]]]:
        """Fetch/cache once for the unified player and correction context."""
        source = await Lrclib.get_lyrics_by_media_ids_async(session=session, media_ids=media_ids)
        if source.is_not_ok():
            logger.warning("Lyrics bundle lookup failed: %s", source.info())
            return Result(code=source.code(), message=source.message())
        bundled = {
            mid: (LyricsData(public_id=pid, lines=plain) if plain is not None else None, dynamic)
            for mid, (pid, plain, dynamic) in source.result().items()
        }
        return Result(code=ResultCode.OK, message="OK", result=bundled)

    async def get_lyrics_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> Result[dict[int, LyricsData]]:
        a_result = await Lrclib.get_lyrics_by_media_ids_async(session=session, media_ids=media_ids)
        if a_result.is_not_ok():
            return Result[dict[int, LyricsData]](code=a_result.code(), message=a_result.message())

        result_map = a_result.result()
        lyrics_map: dict[int, LyricsData] = {}
        for media_id, (public_id, lyrics, _) in result_map.items():
            if lyrics is not None:
                lyrics_map[media_id] = LyricsData(public_id=public_id, lines=lyrics)

        return Result[dict[int, LyricsData]](code=ResultCode.OK, message="OK", result=lyrics_map)

    async def get_dynamic_lyrics_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> Result[dict[int, DynamicLyricsData]]:
        a_result = await Lrclib.get_lyrics_by_media_ids_async(session=session, media_ids=media_ids)
        if a_result.is_not_ok():
            return Result[dict[int, DynamicLyricsData]](
                code=a_result.code(), message=a_result.message()
            )

        result_map = a_result.result()
        dynamic_map: dict[int, DynamicLyricsData] = {}
        for media_id, (_, _, dynamic_data) in result_map.items():
            if dynamic_data is not None:
                dynamic_map[media_id] = dynamic_data

        return Result[dict[int, DynamicLyricsData]](
            code=ResultCode.OK, message="OK", result=dynamic_map
        )


provider = LrclibProvider()
name = "LRCLIB"
