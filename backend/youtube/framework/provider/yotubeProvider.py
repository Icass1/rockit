from logging import Logger
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.utils.logger import getLogger
from backend.youtube.framework.youtube import YouTube

logger: Logger = getLogger(__name__)


class YoutubeProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        YouTube.provider_name = provider_name
        YouTube.provider = self

        self._id = provider_id
        self._name = provider_name


provider = YoutubeProvider()
name = "YouTube"
