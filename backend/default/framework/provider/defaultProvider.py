from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.framework.provider.baseProvider import BaseProvider
from backend.default.framework.playlist import Playlist
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)

name = "Default"


class DefaultProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        self._id = provider_id
        self._name = provider_name

    async def async_init(self, session: AsyncSession) -> None:
        pass

    async def get_playlist_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[BasePlaylistResponse]:
        """Get a default playlist by public_id."""

        a_result_playlist = await Playlist.get_playlist_async(
            session=session, playlist_id=0, user_id=None
        )
        if a_result_playlist.is_not_ok():
            logger.error(f"Error getting playlist. {a_result_playlist.info()}")
            return AResult(
                code=a_result_playlist.code(), message=a_result_playlist.message()
            )

        return AResult(code=AResultCode.NOT_IMPLEMENTED, message="Not implemented")


provider = DefaultProvider()
