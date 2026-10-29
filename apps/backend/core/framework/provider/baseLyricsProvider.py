from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.provider.baseProvider import BaseProvider
from core.models.lyrics import DynamicLyricsData, LyricsData
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class BaseLyricsProvider(BaseProvider):
    """Marker base class for lyrics providers."""

    async def get_lyrics_bundle_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> Result[dict[int, tuple[LyricsData | None, DynamicLyricsData | None]]]:
        """Generic fallback; providers can override to retrieve both forms in one lookup."""
        dynamic = await self.get_dynamic_lyrics_async(session=session, media_ids=media_ids)
        bundled: dict[int, tuple[LyricsData | None, DynamicLyricsData | None]] = {}
        if dynamic.is_ok():
            bundled.update({mid: (None, data) for mid, data in dynamic.result().items()})
        missing = [mid for mid in media_ids if mid not in bundled]
        if missing:
            plain = await self.get_lyrics_async(session=session, media_ids=missing)
            if plain.is_not_ok():
                logger.warning("Plain lyrics lookup failed: %s", plain.info())
                return Result(code=plain.code(), message=plain.message())
            bundled.update({mid: (data, None) for mid, data in plain.result().items()})
        return Result(code=ResultCode.OK, message="OK", result=bundled)

    async def get_lyrics_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> Result[dict[int, LyricsData]]:
        """Get lyrics for the given media IDs.

        Args:
            session (AsyncSession): Database session.
            media_ids (list[int]): List of media IDs to get lyrics for.
        """

        return Result[dict[int, LyricsData]](
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"get_lyrics is not implemented in provider {self._name}.",
        )

    async def get_dynamic_lyrics_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> Result[dict[int, DynamicLyricsData]]:
        """Get dynamic (timed) lyrics for the given media IDs.

        Args:
            session (AsyncSession): Database session.
            media_ids (list[int]): List of media IDs to get dynamic lyrics for.
        """

        return Result[dict[int, DynamicLyricsData]](
            code=ResultCode.NOT_IMPLEMENTED,
            message=f"get_dynamic_lyrics is not implemented in provider {self._name}.",
        )
