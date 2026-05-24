from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.models.lyrics import DynamicLyricsData, LyricsData

from backend.core.framework.provider.baseProvider import BaseProvider


class BaseLyricsProvider(BaseProvider):
    """Marker base class for lyrics providers."""

    async def get_lyrics_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> AResult[dict[int, LyricsData]]:
        """Get lyrics for the given media IDs.

        Args:
            session (AsyncSession): Database session.
            media_ids (list[int]): List of media IDs to get lyrics for.
        """

        return AResult[dict[int, LyricsData]](
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"get_lyrics is not implemented in provider {self._name}.",
        )

    async def get_dynamic_lyrics_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> AResult[dict[int, DynamicLyricsData]]:
        """Get dynamic (timed) lyrics for the given media IDs.

        Args:
            session (AsyncSession): Database session.
            media_ids (list[int]): List of media IDs to get dynamic lyrics for.
        """

        return AResult[dict[int, DynamicLyricsData]](
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"get_dynamic_lyrics is not implemented in provider {self._name}.",
        )
