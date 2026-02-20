from logging import Logger

from backend.utils.logger import getLogger

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.access.enumAccess import EnumAccess

from backend.spotify.enums.copyrightTypeEnum import CopyrightTypeEnum
from backend.spotify.enums.downloadStatusEnum import DownloadStatusEnum

from backend.spotify.access.db.ormEnums.copyrightTypeEnum import CopyrightTypeEnumRow
from backend.spotify.access.db.ormEnums.downloadStatusEnum import DownloadStatusEnumRow

logger: Logger = getLogger(__name__)


class SpotifyProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()
        self.add_enums_initial_content()

    def add_enums_initial_content(self):
        EnumAccess.check_enum_contents(
            DownloadStatusEnum, DownloadStatusEnumRow)
        EnumAccess.check_enum_contents(
            CopyrightTypeEnum, CopyrightTypeEnumRow)


provider = SpotifyProvider()
name = "Spotify"
