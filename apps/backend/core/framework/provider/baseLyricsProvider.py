from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.provider.baseProvider import BaseProvider
from core.models.lyrics import DynamicLyricsData, LyricsData
from result import Result, ResultCode


class BaseLyricsProvider(BaseProvider):
    """Marker base class for lyrics providers."""

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
