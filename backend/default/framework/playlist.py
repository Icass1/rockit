from typing import List, Union
from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode

from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.userAccess import UserAccess
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum

from backend.core.framework.media.media import Media
from backend.core.framework.media.image import Image

from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from backend.core.responses.basePlaylistResponse import (
    BasePlaylistResponse,
    PlaylistContributorResponse,
    PlaylistResponseItem,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.default.access.db.ormModels.playlist import PlaylistRow
from backend.default.access.db.ormModels.playlist_contributor import (
    PlaylistContributorRow,
)
from backend.default.access.db.ormModels.playlist_media import PlaylistMediaRow
from backend.default.access.playlistAccess import PlaylistAccess
from backend.default.framework.default import Default
from backend.default.framework.models.playlist import (
    PlaylistModel,
    PlaylistMediaModel,
    PlaylistContributorModel,
    PlaylistWithDetailsModel,
    MediaInfoModel,
    PlaylistMediaAddModel,
    PlaylistContributorAddModel,
)
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


class Playlist:
    @staticmethod
    async def _get_media_info(
        session: AsyncSession, media_id: int
    ) -> AResult[MediaInfoModel]:
        try:
            a_result = await MediaAccess.get_media_from_id_async(
                session=session, id=media_id
            )
            if a_result.is_not_ok():
                return AResult(code=a_result.code(), message=a_result.message())

            media = a_result.result()
            media_type = MediaTypeEnum(media.media_type_key)

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=MediaInfoModel(
                    media_type=media_type,
                    media_id=media.public_id,
                    provider_id=media.provider_id,
                ),
            )
        except Exception as e:
            logger.error(f"Error getting media info: {e}", exc_info=True)
            return AResult(code=AResultCode.GENERAL_ERROR, message=str(e))

    @staticmethod
    async def create_playlist_async(
        session: AsyncSession,
        name: str,
        owner_id: int,
        description: str | None = None,
        is_public: bool = True,
    ) -> AResult[PlaylistModel]:

        a_result_provider_id: AResult[int] = Default.provider.get_id()
        if a_result_provider_id.is_not_ok():
            logger.error(f"Error getting provider id. {a_result_provider_id.info()}")
            return AResult(
                code=a_result_provider_id.code(), message=a_result_provider_id.message()
            )

        a_result_playlist = await PlaylistAccess.create_playlist_async(
            session=session,
            name=name,
            provider_id=a_result_provider_id.result(),
            owner_id=owner_id,
            description=description,
            is_public=is_public,
        )
        if a_result_playlist.is_not_ok():
            logger.error(
                f"Error creating playlist. {a_result_playlist.info()}", exc_info=True
            )
            return AResult(
                code=a_result_playlist.code(),
                message=a_result_playlist.message(),
            )

        playlist = a_result_playlist.result()
        await PlaylistAccess.add_contributor_async(
            session=session,
            playlist_id=playlist.id,
            user_id=owner_id,
            role_key=PlaylistContributorRoleEnum.OWNER.value,
        )

        await UserAccess.add_user_library_media(
            session=session, user_id=owner_id, media_id=playlist.id
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=PlaylistModel(
                id=playlist.id,
                public_id=playlist.core_playlist.public_id,
                name=playlist.name,
                description=playlist.description,
                image_url=Image.get_internal_image_url(playlist.image),
                is_public=playlist.is_public,
                owner_id=playlist.owner_id,
                date_added=playlist.date_added.isoformat(),
                date_updated=playlist.date_updated.isoformat(),
            ),
        )

    @staticmethod
    async def get_playlist_async(
        session: AsyncSession, playlist_public_id: str, user_id: int | None = None
    ) -> AResult[PlaylistWithDetailsModel]:
        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.get_playlist_by_public_id_async(
                session=session, public_id=playlist_public_id
            )
        )
        if a_result_playlist.is_not_ok():
            logger.error(
                f"Error getting playlist. {a_result_playlist.info()}", exc_info=True
            )
            return AResult(
                code=a_result_playlist.code(),
                message=a_result_playlist.message(),
            )

        playlist: PlaylistRow = a_result_playlist.result()

        if not playlist.is_public and user_id:
            a_result_role: AResult[int] = (
                await PlaylistAccess.get_user_role_in_playlist_async(
                    session=session, playlist_id=playlist.id, user_id=user_id
                )
            )
            if a_result_role.is_not_ok():
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Playlist not found."
                )

        a_result_medias: AResult[List[PlaylistMediaRow]] = (
            await PlaylistAccess.get_playlist_medias_async(
                session=session, playlist_id=playlist.id
            )
        )
        if a_result_medias.is_not_ok():
            logger.error(
                f"Error getting playlist medias. {a_result_medias.info()}",
                exc_info=True,
            )
            return AResult(
                code=a_result_medias.code(),
                message=a_result_medias.message(),
            )

        medias: List[PlaylistMediaRow] = a_result_medias.result()
        disabled_media_ids: list[int] = []
        if user_id:
            a_result_disabled: AResult[List[int]] = (
                await PlaylistAccess.get_user_disabled_medias_async(
                    session=session, user_id=user_id, playlist_id=playlist.id
                )
            )
            if a_result_disabled.is_ok():
                disabled_media_ids = a_result_disabled.result()

        visible_medias: list[PlaylistMediaModel] = []
        for m in medias:
            if m.id not in disabled_media_ids:
                media_row: AResult[MediaInfoModel] = await Playlist._get_media_info(
                    session=session, media_id=m.media_id
                )
                if media_row.is_ok():
                    media_info = media_row.result()
                    visible_medias.append(
                        PlaylistMediaModel(
                            id=m.id,
                            position=m.position,
                            media_type=media_info.media_type,
                            media_id=media_info.media_id,
                            provider_id=media_info.provider_id,
                        )
                    )

        a_result_contributors: AResult[List[PlaylistContributorRow]] = (
            await PlaylistAccess.get_contributors_async(
                session=session, playlist_id=playlist.id
            )
        )
        contributors: list[PlaylistContributorModel] = []
        if a_result_contributors.is_ok():
            for c in a_result_contributors.result():
                contributors.append(
                    PlaylistContributorModel(
                        user_id=c.user_id,
                        role_key=c.role_key,
                    )
                )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=PlaylistWithDetailsModel(
                id=playlist.id,
                public_id=playlist.core_playlist.public_id,
                name=playlist.name,
                description=playlist.description,
                image_url=Image.get_internal_image_url(playlist.image),
                is_public=playlist.is_public,
                owner_id=playlist.owner_id,
                date_added=playlist.date_added.isoformat(),
                date_updated=playlist.date_updated.isoformat(),
                medias=visible_medias,
                contributors=contributors,
            ),
        )

    @staticmethod
    async def get_user_playlists_async(
        session: AsyncSession, user_id: int
    ) -> AResult[list[PlaylistModel]]:
        a_result_playlists: AResult[list[PlaylistRow]] = (
            await PlaylistAccess.get_user_playlists_async(
                session=session, user_id=user_id
            )
        )
        if a_result_playlists.is_not_ok():
            logger.error(
                f"Error getting user playlists. {a_result_playlists.info()}",
                exc_info=True,
            )
            return AResult(
                code=a_result_playlists.code(),
                message=a_result_playlists.message(),
            )

        playlists: List[PlaylistRow] = a_result_playlists.result()
        result_playlists: list[PlaylistModel] = []
        for p in playlists:
            result_playlists.append(
                PlaylistModel(
                    id=p.id,
                    public_id=p.core_playlist.public_id,
                    name=p.name,
                    description=p.description,
                    image_url=Image.get_internal_image_url(p.image),
                    is_public=p.is_public,
                    owner_id=p.owner_id,
                    date_added=p.date_added.isoformat(),
                    date_updated=p.date_updated.isoformat(),
                )
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=result_playlists,
        )

    @staticmethod
    async def update_playlist_async(
        session: AsyncSession,
        playlist_public_id: str,
        user_id: int,
        name: str | None = None,
        description: str | None = None,
        is_public: bool | None = None,
    ) -> AResult[PlaylistModel]:
        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.get_playlist_by_public_id_async(
                session=session, public_id=playlist_public_id
            )
        )
        if a_result_playlist.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        playlist_id: int = a_result_playlist.result().id
        a_result_role = await PlaylistAccess.get_user_role_in_playlist_async(
            session=session, playlist_id=playlist_id, user_id=user_id
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        role = PlaylistContributorRoleEnum(a_result_role.result())
        if role not in [
            PlaylistContributorRoleEnum.OWNER,
            PlaylistContributorRoleEnum.EDITOR,
        ]:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Insufficient permissions."
            )

        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.update_playlist_async(
                session=session,
                playlist_id=playlist_id,
                name=name,
                description=description,
                is_public=is_public,
            )
        )
        if a_result_playlist.is_not_ok():
            logger.error(
                f"Error updating playlist. {a_result_playlist.info()}", exc_info=True
            )
            return AResult(
                code=a_result_playlist.code(),
                message=a_result_playlist.message(),
            )

        playlist: PlaylistRow = a_result_playlist.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=PlaylistModel(
                id=playlist.id,
                public_id=playlist.core_playlist.public_id,
                name=playlist.name,
                description=playlist.description,
                image_url=Image.get_internal_image_url(playlist.image),
                is_public=playlist.is_public,
                owner_id=playlist.owner_id,
                date_added=playlist.date_added.isoformat(),
                date_updated=playlist.date_updated.isoformat(),
            ),
        )

    @staticmethod
    async def delete_playlist_async(
        session: AsyncSession, playlist_public_id: str, user_id: int
    ) -> AResult[bool]:
        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.get_playlist_by_public_id_async(
                session=session, public_id=playlist_public_id
            )
        )
        if a_result_playlist.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        playlist_id: int = a_result_playlist.result().id
        a_result_role: AResult[int] = (
            await PlaylistAccess.get_user_role_in_playlist_async(
                session=session, playlist_id=playlist_id, user_id=user_id
            )
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        role = PlaylistContributorRoleEnum(a_result_role.result())
        if role != PlaylistContributorRoleEnum.OWNER:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Only owner can delete playlist."
            )

        a_result: AResult[bool] = await PlaylistAccess.delete_playlist_async(
            session=session, playlist_id=playlist_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error deleting playlist. {a_result.info()}", exc_info=True)
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def add_media_to_playlist_async(
        session: AsyncSession,
        playlist_public_id: str,
        user_id: int,
        media_public_id: str,
    ) -> AResult[PlaylistMediaAddModel]:
        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.get_playlist_by_public_id_async(
                session=session, public_id=playlist_public_id
            )
        )
        if a_result_playlist.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        playlist_id: int = a_result_playlist.result().id
        a_result_role: AResult[int] = (
            await PlaylistAccess.get_user_role_in_playlist_async(
                session=session, playlist_id=playlist_id, user_id=user_id
            )
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        role_key: int = a_result_role.result()
        role = PlaylistContributorRoleEnum(role_key)
        if role not in [
            PlaylistContributorRoleEnum.OWNER,
            PlaylistContributorRoleEnum.EDITOR,
        ]:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Insufficient permissions."
            )

        a_result_media = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=media_public_id,
            media_type_keys=None,
        )
        if a_result_media.is_not_ok():
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media_row = a_result_media.result()

        a_result: AResult[PlaylistMediaRow] = (
            await PlaylistAccess.add_media_to_playlist_async(
                session=session,
                playlist_id=playlist_id,
                media_id=media_row.id,
            )
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error adding media to playlist. {a_result.info()}", exc_info=True
            )
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        playlist_media = a_result.result()
        media_type = MediaTypeEnum(media_row.media_type_key)
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=PlaylistMediaAddModel(
                id=playlist_media.id,
                position=playlist_media.position,
                media_type=media_type,
                media_id=media_row.public_id,
                provider_id=media_row.provider_id,
            ),
        )

    @staticmethod
    async def remove_media_from_playlist_async(
        session: AsyncSession,
        playlist_public_id: str,
        media_public_id: str,
        user_id: int,
    ) -> AResult[bool]:
        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.get_playlist_by_public_id_async(
                session=session, public_id=playlist_public_id
            )
        )
        if a_result_playlist.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        playlist_id: int = a_result_playlist.result().id

        a_result_role: AResult[int] = (
            await PlaylistAccess.get_user_role_in_playlist_async(
                session=session, playlist_id=playlist_id, user_id=user_id
            )
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        role_key: int = a_result_role.result()
        role = PlaylistContributorRoleEnum(role_key)
        if role not in [
            PlaylistContributorRoleEnum.OWNER,
            PlaylistContributorRoleEnum.EDITOR,
        ]:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Insufficient permissions."
            )

        a_result_media = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=media_public_id,
            media_type_keys=None,
        )
        if a_result_media.is_not_ok():
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media_row = a_result_media.result()

        a_result_playlist_media: AResult[PlaylistMediaRow] = (
            await PlaylistAccess.get_playlist_media_by_media_id_async(
                session=session, playlist_id=playlist_id, media_id=media_row.id
            )
        )
        if a_result_playlist_media.is_not_ok():
            return AResult(
                code=a_result_playlist_media.code(),
                message=a_result_playlist_media.message(),
            )

        playlist_media_id: int = a_result_playlist_media.result().id

        a_result: AResult[bool] = await PlaylistAccess.remove_media_from_playlist_async(
            session=session, playlist_media_id=playlist_media_id
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error removing media from playlist. {a_result.info()}", exc_info=True
            )
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def add_contributor_async(
        session: AsyncSession,
        playlist_public_id: str,
        owner_id: int,
        new_user_public_id: str,
        role: PlaylistContributorRoleEnum,
    ) -> AResult[PlaylistContributorAddModel]:
        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.get_playlist_by_public_id_async(
                session=session, public_id=playlist_public_id
            )
        )
        if a_result_playlist.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        playlist_id: int = a_result_playlist.result().id

        a_result_role = await PlaylistAccess.get_user_role_in_playlist_async(
            session=session, playlist_id=playlist_id, user_id=owner_id
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        role_enum = PlaylistContributorRoleEnum(a_result_role.result())
        if role_enum != PlaylistContributorRoleEnum.OWNER:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Only owner can add contributors."
            )

        a_result_new_user = await UserAccess.get_user_from_public_id_async(
            session=session, public_id=new_user_public_id
        )
        if a_result_new_user.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="User not found.",
            )

        new_user_id: int = a_result_new_user.result().id

        a_result = await PlaylistAccess.add_contributor_async(
            session=session,
            playlist_id=playlist_id,
            user_id=new_user_id,
            role_key=role.value,
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding contributor. {a_result.info()}", exc_info=True)
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        contributor: PlaylistContributorRow = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=PlaylistContributorAddModel(
                user_id=contributor.user_id,
                role=role,
            ),
        )

    @staticmethod
    async def remove_contributor_async(
        session: AsyncSession,
        playlist_public_id: str,
        owner_id: int,
        target_user_public_id: str,
    ) -> AResult[bool]:
        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.get_playlist_by_public_id_async(
                session=session, public_id=playlist_public_id
            )
        )
        if a_result_playlist.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        playlist_id: int = a_result_playlist.result().id

        a_result_role = await PlaylistAccess.get_user_role_in_playlist_async(
            session=session, playlist_id=playlist_id, user_id=owner_id
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        role = PlaylistContributorRoleEnum(a_result_role.result())
        if role != PlaylistContributorRoleEnum.OWNER:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Only owner can remove contributors.",
            )

        a_result_target_user = await UserAccess.get_user_from_public_id_async(
            session=session, public_id=target_user_public_id
        )
        if a_result_target_user.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="User not found.",
            )

        target_user_id: int = a_result_target_user.result().id

        a_result = await PlaylistAccess.remove_contributor_async(
            session=session, playlist_id=playlist_id, user_id=target_user_id
        )
        if a_result.is_not_ok():
            logger.error(
                f"Error removing contributor. {a_result.info()}", exc_info=True
            )
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def disable_media_for_user_async(
        session: AsyncSession,
        playlist_public_id: str,
        user_id: int,
        playlist_media_public_id: str,
    ) -> AResult[bool]:
        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.get_playlist_by_public_id_async(
                session=session, public_id=playlist_public_id
            )
        )
        if a_result_playlist.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found.",
            )

        playlist_id: int = a_result_playlist.result().id

        a_result_media = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=playlist_media_public_id,
            media_type_keys=None,
        )
        if a_result_media.is_not_ok():
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media_row = a_result_media.result()

        a_result_playlist_media: AResult[PlaylistMediaRow] = (
            await PlaylistAccess.get_playlist_media_by_media_id_async(
                session=session,
                playlist_id=playlist_id,
                media_id=media_row.id,
            )
        )
        if a_result_playlist_media.is_not_ok():
            logger.error(
                f"Error getting playlist media. {a_result_playlist_media.info()}"
            )
            return AResult(
                code=a_result_playlist_media.code(),
                message=a_result_playlist_media.message(),
            )

        playlist_media_id: int = a_result_playlist_media.result().id

        a_result = await PlaylistAccess.disable_media_for_user_async(
            session=session, user_id=user_id, playlist_media_id=playlist_media_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error disabling media. {a_result.info()}", exc_info=True)
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def enable_media_for_user_async(
        session: AsyncSession,
        playlist_public_id: str,
        user_id: int,
        playlist_media_public_id: str,
    ) -> AResult[bool]:
        a_result_playlist: AResult[PlaylistRow] = (
            await PlaylistAccess.get_playlist_by_public_id_async(
                session=session, public_id=playlist_public_id
            )
        )
        if a_result_playlist.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found.",
            )

        playlist_id: int = a_result_playlist.result().id

        a_result_media = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=playlist_media_public_id,
            media_type_keys=None,
        )
        if a_result_media.is_not_ok():
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media_row = a_result_media.result()

        a_result_playlist_media: AResult[PlaylistMediaRow] = (
            await PlaylistAccess.get_playlist_media_by_media_id_async(
                session=session,
                playlist_id=playlist_id,
                media_id=media_row.id,
            )
        )
        if a_result_playlist_media.is_not_ok():
            logger.error(
                f"Error getting playlist media. {a_result_playlist_media.info()}"
            )
            return AResult(
                code=a_result_playlist_media.code(),
                message=a_result_playlist_media.message(),
            )

        playlist_media_id: int = a_result_playlist_media.result().id

        a_result = await PlaylistAccess.enable_media_for_user_async(
            session=session, user_id=user_id, playlist_media_id=playlist_media_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error enabling media. {a_result.info()}", exc_info=True)
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def build_playlist_response_async(
        session: AsyncSession,
        playlist: PlaylistWithDetailsModel,
        owner_name: str,
    ) -> AResult[BasePlaylistResponse]:
        """Build a BasePlaylistResponse from a PlaylistWithDetailsModel."""

        medias: List[
            Union[
                PlaylistResponseItem[BaseSongWithAlbumResponse],
                PlaylistResponseItem[BaseVideoResponse],
                PlaylistResponseItem[BaseStationResponse],
                PlaylistResponseItem[BasePlaylistForPlaylistResponse],
                PlaylistResponseItem[BaseAlbumWithoutSongsResponse],
            ]
        ] = []
        for media in playlist.medias:
            if media.media_type == MediaTypeEnum.SONG:
                a_result_song = await Media.get_song_async(
                    session=session, public_id=media.media_id
                )
                if a_result_song.is_ok():
                    medias.append(
                        PlaylistResponseItem(
                            item=a_result_song.result(),
                            addedAt=playlist.date_added,
                        )
                    )
            elif media.media_type == MediaTypeEnum.VIDEO:
                a_result_video = await Media.get_video_async(
                    session=session, public_id=media.media_id
                )
                if a_result_video.is_ok():
                    medias.append(
                        PlaylistResponseItem(
                            item=a_result_video.result(),
                            addedAt=playlist.date_added,
                        )
                    )
            elif media.media_type == MediaTypeEnum.ALBUM:
                a_result_album = await Media.get_album_async(
                    session=session, public_id=media.media_id
                )
                if a_result_album.is_ok():
                    medias.append(
                        PlaylistResponseItem(
                            item=a_result_album.result(),
                            addedAt=playlist.date_added,
                        )
                    )
            elif media.media_type == MediaTypeEnum.PLAYLIST:
                a_result_playlist = await Media.get_playlist_async(
                    session=session, user_id=playlist.owner_id, public_id=media.media_id
                )
                if a_result_playlist.is_ok():
                    playlist_result: BasePlaylistResponse = a_result_playlist.result()
                    playlist_for_playlist: BasePlaylistForPlaylistResponse = (
                        BasePlaylistForPlaylistResponse(
                            type=playlist_result.type,
                            provider=playlist_result.provider,
                            publicId=playlist_result.publicId,
                            url=playlist_result.url,
                            providerUrl=playlist_result.providerUrl,
                            name=playlist_result.name,
                            imageUrl=playlist_result.imageUrl,
                            owner=playlist_result.owner,
                            description=playlist_result.description,
                            itemCount=len(playlist_result.medias),
                        )
                    )
                    medias.append(
                        PlaylistResponseItem(
                            item=playlist_for_playlist,
                            addedAt=playlist.date_added,
                        )
                    )

        contributor_responses: List[PlaylistContributorResponse] = [
            PlaylistContributorResponse(
                user_id=c.user_id,
                role=PlaylistContributorRoleEnum(c.role_key),
            )
            for c in playlist.contributors
        ]

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=BasePlaylistResponse(
                type="playlist",
                description=playlist.description,
                provider=Default.provider_name,
                publicId=playlist.public_id,
                url=f"/playlist/{playlist.public_id}",
                providerUrl="",
                name=playlist.name,
                medias=medias,
                contributors=contributor_responses,
                imageUrl=playlist.image_url,
                owner=owner_name,
            ),
        )
