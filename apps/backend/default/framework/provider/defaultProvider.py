from logging import Logger
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.user import UserRow
from core.access.userAccess import UserAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from core.framework.core import Core
from core.framework.media.image import Image
from core.framework.media.media import Media
from core.framework.models.media import MediaModel
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.types.playlistContributor import PlaylistContributor
from core.utils.timeIt import time_it
from default.access.recommendationAccess import RecommendationAccess
from default.framework.default import Default
from default.framework.models.playlist import PlaylistWithDetailsModel
from default.framework.playlist import Playlist
from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


class DefaultProvider(BaseMediaProvider):
    def download_concurrency_limit(self) -> int:
        return 2

    async def add_media_to_playlist_async(
        self,
        session: AsyncSession,
        playlist_public_id: str,
        user_id: int,
        media_public_id: str,
    ) -> Result[Any]:
        return await Playlist.add_media_to_playlist_async(
            session=session,
            playlist_public_id=playlist_public_id,
            user_id=user_id,
            media_public_id=media_public_id,
        )

    async def set_media_expanded_async(
        self,
        session: AsyncSession,
        user_id: int,
        playlist_public_id: str,
        media_public_id: str,
        is_expanded: bool,
    ) -> Result[bool]:
        return await Playlist.set_media_expanded_async(
            session=session,
            user_id=user_id,
            playlist_public_id=playlist_public_id,
            media_public_id=media_public_id,
            is_expanded=is_expanded,
        )

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
        public_ids: list[str],
        _visited_playlist_ids: set[str] | None = None,
    ) -> Result[list[BasePlaylistWithMediasResponse]]:
        """Get default playlists by public_ids with medias."""

        results: list[BasePlaylistWithMediasResponse] = []
        for public_id in public_ids:
            a_result_media: Result[MediaModel] = await Media.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.PLAYLIST],
            )
            if a_result_media.is_not_ok():
                logger.error(f"Error getting media. {a_result_media.info()}")
                continue

            a_result_playlist: Result[PlaylistWithDetailsModel] = await Playlist.get_playlist_async(
                session=session,
                playlist_public_id=a_result_media.result().public_id,
                user_id=user_id,
            )
            if a_result_playlist.is_not_ok():
                logger.error(f"Error getting playlist. {a_result_playlist.info()}")
                continue

            playlist: PlaylistWithDetailsModel = a_result_playlist.result()

            a_result_owner: Result[UserRow] = await UserAccess.get_user_from_id(
                session=session, user_id=playlist.owner_id
            )
            if a_result_owner.is_not_ok():
                logger.error(f"Error getting owner. {a_result_owner.info()}")
                continue

            owner = a_result_owner.result()
            owner_name: str = owner.username

            a_result_response: Result[
                BasePlaylistWithMediasResponse
            ] = await Playlist.build_playlist_response_async(
                session=session,
                playlist=playlist,
                owner=BaseArtistResponse(
                    provider=Core.provider_name,
                    publicId=owner.public_id,
                    url=f"/user/{owner.public_id}",
                    providerUrl="",
                    name=owner_name,
                    imageUrl=Image.get_image_url(owner.image),
                    dominantColor=owner.image.dominant_color,
                ),
                user_id=user_id,
                _visited_playlist_ids=_visited_playlist_ids,
            )
            if a_result_response.is_not_ok():
                logger.error(f"Error building playlist response. {a_result_response.info()}")
                continue

            results.append(a_result_response.result())

        return Result(code=ResultCode.OK, message="OK", result=results)

    @time_it
    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> Result[list[BasePlaylistWithoutMediasResponse]]:
        """Get default playlists by public_ids without medias."""

        results: list[BasePlaylistWithoutMediasResponse] = []
        for public_id in public_ids:
            a_result_media: Result[MediaModel] = await Media.get_media_from_public_id_async(
                session=session,
                public_id=public_id,
                media_type_keys=[MediaTypeEnum.PLAYLIST],
            )
            if a_result_media.is_not_ok():
                logger.error(f"Error getting media. {a_result_media.info()}")
                continue

            a_result_playlist: Result[PlaylistWithDetailsModel] = await Playlist.get_playlist_async(
                session=session,
                playlist_public_id=a_result_media.result().public_id,
                user_id=user_id,
                include_medias=False,
            )
            if a_result_playlist.is_not_ok():
                logger.error(f"Error getting playlist. {a_result_playlist.info()}")
                continue

            playlist: PlaylistWithDetailsModel = a_result_playlist.result()

            a_result_owner: Result[UserRow] = await UserAccess.get_user_from_id(
                session=session, user_id=playlist.owner_id
            )
            if a_result_owner.is_not_ok():
                logger.error(f"Error getting owner. {a_result_owner.info()}")
                continue

            owner = a_result_owner.result()
            owner_name: str = owner.username

            contributor_responses: list[PlaylistContributor] = []
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
                        imageUrl=Image.get_image_url(owner.image),
                        dominantColor=owner.image.dominant_color,
                    ),
                )
            )

        return Result(code=ResultCode.OK, message="OK", result=results)

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> Result[int]:
        """Get the duration of a default playlist in milliseconds."""
        return Result(code=ResultCode.OK, message="OK", result=0)

    def get_recommendation_playlist_edges_cte_fragment(self) -> str | None:
        return RecommendationAccess.playlist_edges_cte_fragment()

    def get_search_index_cte_fragment(self) -> str | None:
        return f"""    SELECT cm.id                          AS internal_id,
           cm.public_id                    AS public_id,
           pl.name                         AS name,
           NULL                            AS subtitle,
           {MediaTypeEnum.PLAYLIST.value}  AS media_type_key,
           p.name                          AS provider_name,
           ci.url                          AS image_url
    FROM   default_schema.playlist pl
    JOIN   core.media    cm ON cm.id = pl.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = pl.image_id"""


provider = DefaultProvider()
name = "Default"
