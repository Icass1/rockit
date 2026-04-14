from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it
from backend.core.aResult import AResult, AResultCode

from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.userAccess import UserAccess
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.provider.baseProvider import BaseProvider

from backend.core.responses.basePlaylistResponse import BasePlaylistResponse

from backend.default.framework.default import Default
from backend.default.framework.playlist import Playlist
from backend.default.framework.models.playlist import PlaylistWithDetailsModel

logger: Logger = getLogger(__name__)


class DefaultProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        Default.provider_name = provider_name
        Default.provider = self

        self._id = provider_id
        self._name = provider_name

    async def async_init(self, session: AsyncSession) -> None:
        await self.add_enum_contents(session=session)

    async def add_enum_contents(self, session: AsyncSession) -> None:
        """Populate provider-owned enum tables in the database."""

    @time_it
    async def get_playlist_async(
        self, session: AsyncSession, user_id: int, public_id: str
    ) -> AResult[BasePlaylistResponse]:
        """Get a default playlist by public_id."""

        a_result_media: AResult[MediaModel] = (
            await Media.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.PLAYLIST],
            )
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media. {a_result_media.info()}")
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        a_result_playlist: AResult[PlaylistWithDetailsModel] = (
            await Playlist.get_playlist_async(
                session=session,
                playlist_public_id=a_result_media.result().public_id,
                user_id=user_id,
            )
        )
        if a_result_playlist.is_not_ok():
            logger.error(f"Error getting playlist. {a_result_playlist.info()}")
            return AResult(
                code=a_result_playlist.code(), message=a_result_playlist.message()
            )

        playlist: PlaylistWithDetailsModel = a_result_playlist.result()

        a_result_owner: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=playlist.owner_id
        )
        if a_result_owner.is_not_ok():
            logger.error(f"Error getting owner. {a_result_owner.info()}")
            return AResult(code=a_result_owner.code(), message=a_result_owner.message())

        owner = a_result_owner.result()
        owner_name: str = owner.username

        a_result_response: AResult[BasePlaylistResponse] = (
            await Playlist.build_playlist_response_async(
                session=session, playlist=playlist, owner_name=owner_name
            )
        )
        if a_result_response.is_not_ok():
            logger.error(
                f"Error building playlist response. {a_result_response.info()}"
            )
            return AResult(
                code=a_result_response.code(), message=a_result_response.message()
            )

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_response.result()
        )

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        """Get the duration of a default playlist in milliseconds."""
        return AResult(code=AResultCode.OK, message="OK", result=0)


provider = DefaultProvider()
name = "Default"
