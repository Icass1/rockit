from backend.core.framework.provider.baseLyricsProvider import BaseLyricsProvider

from backend.lrclib.framework.lrclib import Lrclib


class LrclibProvider(BaseLyricsProvider):
    pass

    def set_info(self, provider_id: int, provider_name: str) -> None:
        Lrclib.provider_name = provider_name
        Lrclib.provider = self

        self._id = provider_id
        self._name = provider_name


provider = LrclibProvider()
name = "LRCLIB"
