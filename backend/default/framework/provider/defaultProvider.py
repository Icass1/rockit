from logging import Logger
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it
from backend.core.aResult import AResult, AResultCode

from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.userAccess import UserAccess

from backend.core.framework.core import Core
from backend.core.framework.media.image import Image
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider

from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from backend.core.types.playlistContributor import PlaylistContributor

from backend.default.framework.default import Default
from backend.default.framework.playlist import Playlist
from backend.default.framework.models.playlist import PlaylistWithDetailsModel

logger: Logger = getLogger(__name__)


class DefaultProvider(BaseMediaProvider):
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
    async def get_playlists_with_medias_async(
        self,
        session: AsyncSession,
        user_id: int,
        public_ids: List[str],
        _visited_playlist_ids: set[str] | None = None,
    ) -> AResult[List[BasePlaylistWithMediasResponse]]:
        """Get default playlists by public_ids with medias."""

        results: List[BasePlaylistWithMediasResponse] = []
        for public_id in public_ids:
            a_result_media: AResult[MediaModel] = (
                await Media.get_media_from_public_id_async(
                    session=session,
                    public_id=public_id,
                    media_type_keys=[MediaTypeEnum.PLAYLIST],
                )
            )
            if a_result_media.is_not_ok():
                logger.error(f"Error getting media. {a_result_media.info()}")
                continue

            a_result_playlist: AResult[PlaylistWithDetailsModel] = (
                await Playlist.get_playlist_async(
                    session=session,
                    playlist_public_id=a_result_media.result().public_id,
                    user_id=user_id,
                )
            )
            if a_result_playlist.is_not_ok():
                logger.error(f"Error getting playlist. {a_result_playlist.info()}")
                continue

            playlist: PlaylistWithDetailsModel = a_result_playlist.result()

            a_result_owner: AResult[UserRow] = await UserAccess.get_user_from_id(
                session=session, user_id=playlist.owner_id
            )
            if a_result_owner.is_not_ok():
                logger.error(f"Error getting owner. {a_result_owner.info()}")
                continue

            owner = a_result_owner.result()
            owner_name: str = owner.username

            a_result_response: AResult[BasePlaylistWithMediasResponse] = (
                await Playlist.build_playlist_response_async(
                    session=session,
                    playlist=playlist,
                    owner=BaseArtistResponse(
                        provider=Core.provider_name,
                        publicId=owner.public_id,
                        url=f"/user/{owner.public_id}",
                        providerUrl="",
                        name=owner_name,
                        imageUrl=Image.get_internal_image_url(owner.image),
                    ),
                    user_id=user_id,
                    _visited_playlist_ids=_visited_playlist_ids,
                )
            )
            if a_result_response.is_not_ok():
                logger.error(
                    f"Error building playlist response. {a_result_response.info()}"
                )
                continue

            results.append(a_result_response.result())

        return AResult(code=AResultCode.OK, message="OK", result=results)

    @time_it
    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[BasePlaylistWithoutMediasResponse]]:
        """Get default playlists by public_ids without medias."""

        results: List[BasePlaylistWithoutMediasResponse] = []
        for public_id in public_ids:
            a_result_media: AResult[MediaModel] = (
                await Media.get_media_from_public_id_async(
                    session=session,
                    public_id=public_id,
                    media_type_keys=[MediaTypeEnum.PLAYLIST],
                )
            )
            if a_result_media.is_not_ok():
                logger.error(f"Error getting media. {a_result_media.info()}")
                continue

            a_result_playlist: AResult[PlaylistWithDetailsModel] = (
                await Playlist.get_playlist_async(
                    session=session,
                    playlist_public_id=a_result_media.result().public_id,
                    user_id=user_id,
                )
            )
            if a_result_playlist.is_not_ok():
                logger.error(f"Error getting playlist. {a_result_playlist.info()}")
                continue

            playlist: PlaylistWithDetailsModel = a_result_playlist.result()

            a_result_owner: AResult[UserRow] = await UserAccess.get_user_from_id(
                session=session, user_id=playlist.owner_id
            )
            if a_result_owner.is_not_ok():
                logger.error(f"Error getting owner. {a_result_owner.info()}")
                continue

            owner = a_result_owner.result()
            owner_name: str = owner.username

            contributor_responses: List[PlaylistContributor] = []
            for c in playlist.contributors:
                a_result_user = await UserAccess.get_user_from_id(
                    session=session, user_id=c.user_id
                )
                if a_result_user.is_not_ok():
                    continue
                user = a_result_user.result()
                contributor_responses.append(
                    PlaylistContributor(
                        userPublicId=user.public_id,
                        username=user.username,
                        role=PlaylistContributorRoleEnum(c.role_key),
                    )
                )

            results.append(
                BasePlaylistWithoutMediasResponse(
                    type="playlist",
                    description=playlist.description,
                    provider=Default.provider_name,
                    publicId=playlist.public_id,
                    url=f"/playlist/{playlist.public_id}",
                    providerUrl="",
                    name=playlist.name,
                    contributors=contributor_responses,
                    imageUrl=playlist.image_url,
                    owner=BaseArtistResponse(
                        provider=Core.provider_name,
                        publicId=owner.public_id,
                        url=f"/user/{owner.public_id}",
                        providerUrl="",
                        name=owner_name,
                        imageUrl=Image.get_internal_image_url(owner.image),
                    ),
                )
            )

        return AResult(code=AResultCode.OK, message="OK", result=results)

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> AResult[int]:
        """Get the duration of a default playlist in milliseconds."""
        return AResult(code=AResultCode.OK, message="OK", result=0)


provider = DefaultProvider()
name = "Default"
