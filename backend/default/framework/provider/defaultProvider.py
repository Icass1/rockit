from logging import Logger
from typing import List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.userAccess import UserAccess
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.responses.basePlaylistResponse import (
    BasePlaylistResponse,
    PlaylistResponseItem,
)
from backend.core.responses.baseSongWithAlbumResponse import (
    BaseSongWithAlbumResponse,
)
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.framework.provider.baseProvider import BaseProvider

from backend.default.framework.default import Default
from backend.default.framework.playlist import Playlist
from backend.default.framework.models.playlist import PlaylistWithDetailsModel

logger: Logger = getLogger(__name__)

name = "Default"


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
                session=session, playlist_id=a_result_media.result().id, user_id=user_id
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

        medias: List[PlaylistResponseItem[BaseSongWithAlbumResponse]] = []
        for media in playlist.medias:
            if media.media_type == "song":
                a_result_song: AResult[BaseSongWithAlbumResponse] = (
                    await Media.get_song_async(
                        session=session, public_id=media.media_id
                    )
                )
                if a_result_song.is_ok():
                    medias.append(
                        PlaylistResponseItem(
                            item=a_result_song.result(),
                            addedAt=datetime.now(),
                        )
                    )

        playlist_response = BasePlaylistResponse(
            type="playlist",
            description=playlist.description,
            provider="default",
            publicId=playlist.public_id,
            url=f"/playlist/{playlist.public_id}",
            name=playlist.name,
            medias=medias,
            contributors=[],
            internalImageUrl=playlist.cover_image or "",
            owner=owner_name,
        )

        return AResult(code=AResultCode.OK, message="OK", result=playlist_response)


provider = DefaultProvider()
