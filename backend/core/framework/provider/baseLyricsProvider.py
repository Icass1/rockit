from backend.core.aResult import AResult, AResultCode
from backend.core.models.lyrics import DynamicLyrics, Lyrics

from backend.core.framework.provider.baseProvider import BaseProvider


class BaseLyricsProvider(BaseProvider):
    """Marker base class for lyrics providers."""

    def get_lyrics(self, media_ids: list[int]) -> AResult[dict[int, list[Lyrics]]]:
        """Get lyrics for the given media IDs.

        Args:
            media_ids (list[int]): List of media IDs to get lyrics for.
        """

        return AResult[dict[int, list[Lyrics]]](
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"get_lyrics is not implemented in provider {self._name}.",
        )

    def get_dynamic_lyrics(
        self, media_ids: list[int]
    ) -> AResult[dict[int, list[DynamicLyrics]]]:
        """Get lyrics for the given media IDs.

        Args:
            media_ids (list[int]): List of media IDs to get lyrics for.
        """

        return AResult[dict[int, list[DynamicLyrics]]](
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"get_dynamic_lyrics is not implemented in provider {self._name}.",
        )
