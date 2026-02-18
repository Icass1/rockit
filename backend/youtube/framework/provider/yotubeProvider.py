from logging import Logger
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.utils.logger import getLogger


logger: Logger = getLogger(__name__)


class YoutubeProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()


provider = YoutubeProvider()

name = "YouTube"
