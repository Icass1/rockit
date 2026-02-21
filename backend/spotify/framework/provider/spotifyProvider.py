from logging import Logger

from backend.utils.logger import getLogger

from backend.core.access.enumAccess import EnumAccess
from backend.core.framework.provider.baseProvider import BaseProvider

from backend.spotify.enums.copyrightTypeEnum import CopyrightTypeEnum
from backend.spotify.enums.downloadStatusEnum import DownloadStatusEnum

from backend.spotify.access.db.ormEnums.copyrightTypeEnum import CopyrightTypeEnumRow
from backend.spotify.access.db.ormEnums.downloadStatusEnum import DownloadStatusEnumRow

logger: Logger = getLogger(__name__)


class SpotifyProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()

    async def add_enum_contents(self):
        await EnumAccess.check_enum_contents_async(
            enum_class=DownloadStatusEnum,
            table=DownloadStatusEnumRow)
        await EnumAccess.check_enum_contents_async(
            enum_class=CopyrightTypeEnum,
            table=CopyrightTypeEnumRow)


provider = SpotifyProvider()
name = "Spotify"
