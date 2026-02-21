from logging import Logger
from typing import List

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.responses.searchResponse import BaseSearchItem

from backend.core.access.enumAccess import EnumAccess

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.spotify.framework.spotify import Spotify

from backend.spotify.enums.copyrightTypeEnum import CopyrightTypeEnum
from backend.spotify.enums.downloadStatusEnum import DownloadStatusEnum

from backend.spotify.access.db.ormEnums.copyrightTypeEnum import CopyrightTypeEnumRow
from backend.spotify.access.db.ormEnums.downloadStatusEnum import DownloadStatusEnumRow

logger: Logger = getLogger(__name__)


class SpotifyProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        Spotify.provider_name = provider_name
        Spotify.provider = self

        self._id = provider_id
        self._name = provider_name

    async def async_init(self) -> None:
        await self.add_enum_contents()

    async def add_enum_contents(self) -> None:
        await EnumAccess.check_enum_contents_async(
            enum_class=DownloadStatusEnum,
            table=DownloadStatusEnumRow)
        await EnumAccess.check_enum_contents_async(
            enum_class=CopyrightTypeEnum,
            table=CopyrightTypeEnumRow)

    async def search_async(self, query: str) -> AResult[List[BaseSearchItem]]:
        """Search Spotify and return a list of search items."""

        a_result: AResult[List[BaseSearchItem]] = await Spotify.search_async(query)
        if a_result.is_not_ok():
            logger.error(f"Error searching Spotify. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())


provider = SpotifyProvider()
name = "Spotify"
