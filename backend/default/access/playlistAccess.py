from logging import Logger
from typing import List, Tuple
from sqlalchemy.future import select
from sqlalchemy import Result, Select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.media.image import Image

from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.image import ImageRow

from backend.default.access.db.ormModels.playlist import PlaylistRow
from backend.default.access.db.ormModels.playlist_media import PlaylistMediaRow
from backend.default.access.db.ormModels.playlist_contributor import (
    PlaylistContributorRow,
)
from backend.default.access.db.ormModels.user_disabled_playlist_media import (
    UserDisabledPlaylistMediaRow,
)

logger: Logger = getLogger(__name__)


class PlaylistAccess:
    @staticmethod
    async def create_playlist_async(
        session: AsyncSession,
        name: str,
        owner_id: int,
        provider_id: int,
        description: str | None = None,
        is_public: bool = True,
    ) -> AResult[PlaylistRow]:
        try:
            a_result_image: AResult[ImageRow] = await Image.get_image_from_path_async(
                session=session, path="playlist-placeholder.png"
            )
            if a_result_image.is_not_ok():
                logger.error(
                    f"Error getting placeholder image: {a_result_image.info()}"
                )
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Failed to get placeholder image",
                )

            core_media: CoreMediaRow = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.PLAYLIST.value,
            )
            session.add(instance=core_media)
            await session.flush()
            await session.refresh(instance=core_media)

            playlist: PlaylistRow = PlaylistRow(
                id=core_media.id,
                name=name,
                image_id=a_result_image.result().id,
                owner_id=owner_id,
                description=description,
                is_public=is_public,
            )
            session.add(instance=playlist)
            await session.commit()
            await session.refresh(instance=playlist)
            return AResult(code=AResultCode.OK, message="OK", result=playlist)
        except Exception as e:
            logger.error(f"Error in create_playlist_async: {e}", exc_info=True)
            await session.rollback()
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to create playlist: {e}",
            )

    @staticmethod
    async def get_playlist_by_id_async(
        session: AsyncSession, playlist_id: int
    ) -> AResult[PlaylistRow]:
        try:
            result: PlaylistRow | None = await session.get(
                entity=PlaylistRow, ident=playlist_id
            )
            if not result:
                logger.error(f"Playlist with {playlist_id} not found.")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"Playlist {playlist_id} not found.",
                )
            return AResult(code=AResultCode.OK, message="OK", result=result)
        except Exception as e:
            logger.error(f"Error in get_playlist_by_id_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist: {e}",
            )

    @staticmethod
    async def get_playlist_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[PlaylistRow]:
        try:
            stmt: Select[Tuple[PlaylistRow]] = (
                select(PlaylistRow)
                .join(CoreMediaRow, PlaylistRow.id == CoreMediaRow.id)
                .where(CoreMediaRow.public_id == public_id)
            )
            result: Result[Tuple[PlaylistRow]] = await session.execute(statement=stmt)
            playlist: PlaylistRow | None = result.scalar_one_or_none()
            if not playlist:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Playlist not found."
                )
            return AResult(code=AResultCode.OK, message="OK", result=playlist)
        except Exception as e:
            logger.error(
                f"Error in get_playlist_by_public_id_async: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist: {e}",
            )

    @staticmethod
    async def get_user_playlists_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[PlaylistRow]]:
        try:
            stmt: Select[Tuple[PlaylistRow]] = select(PlaylistRow).where(
                PlaylistRow.owner_id == user_id
            )
            result: Result[Tuple[PlaylistRow]] = await session.execute(statement=stmt)
            playlists: List[PlaylistRow] = list(result.scalars().all())
            return AResult(code=AResultCode.OK, message="OK", result=playlists)
        except Exception as e:
            logger.error(f"Error in get_user_playlists_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlists: {e}",
            )

    @staticmethod
    async def update_playlist_async(
        session: AsyncSession,
        playlist_id: int,
        name: str | None = None,
        description: str | None = None,
        is_public: bool | None = None,
    ) -> AResult[PlaylistRow]:
        try:
            playlist: PlaylistRow | None = await session.get(
                entity=PlaylistRow, ident=playlist_id
            )
            if not playlist:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Playlist not found."
                )
            if name is not None:
                playlist.name = name
            if description is not None:
                playlist.description = description
            if is_public is not None:
                playlist.is_public = is_public
            await session.commit()
            await session.refresh(instance=playlist)
            return AResult(code=AResultCode.OK, message="OK", result=playlist)
        except Exception as e:
            logger.error(f"Error in update_playlist_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to update playlist: {e}",
            )

    @staticmethod
    async def delete_playlist_async(
        session: AsyncSession, playlist_id: int
    ) -> AResult[bool]:
        try:
            playlist: PlaylistRow | None = await session.get(
                entity=PlaylistRow, ident=playlist_id
            )
            if not playlist:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Playlist not found."
                )
            await session.delete(instance=playlist)
            await session.commit()
            return AResult(code=AResultCode.OK, message="OK", result=True)
        except Exception as e:
            logger.error(f"Error in delete_playlist_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to delete playlist: {e}",
            )

    @staticmethod
    async def add_media_to_playlist_async(
        session: AsyncSession,
        playlist_id: int,
        media_id: int,
    ) -> AResult[PlaylistMediaRow]:
        try:
            stmt: Select[Tuple[PlaylistMediaRow]] = (
                select(PlaylistMediaRow)
                .where(PlaylistMediaRow.playlist_id == playlist_id)
                .order_by(PlaylistMediaRow.position.desc())
                .limit(1)
            )
            result: Result[Tuple[PlaylistMediaRow]] = await session.execute(
                statement=stmt
            )
            last_media: PlaylistMediaRow | None = result.scalar_one_or_none()
            next_position: int = (last_media.position + 1) if last_media else 0

            playlist_media = PlaylistMediaRow(
                playlist_id=playlist_id,
                position=next_position,
                media_id=media_id,
            )
            session.add(instance=playlist_media)
            await session.commit()
            await session.refresh(instance=playlist_media)
            return AResult(code=AResultCode.OK, message="OK", result=playlist_media)
        except Exception as e:
            logger.error(f"Error in add_media_to_playlist_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add media to playlist: {e}",
            )

    @staticmethod
    async def remove_media_from_playlist_async(
        session: AsyncSession, playlist_media_id: int
    ) -> AResult[bool]:
        try:
            playlist_media: PlaylistMediaRow | None = await session.get(
                entity=PlaylistMediaRow, ident=playlist_media_id
            )
            if not playlist_media:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Playlist media not found."
                )
            await session.delete(instance=playlist_media)
            await session.commit()
            return AResult(code=AResultCode.OK, message="OK", result=True)
        except Exception as e:
            logger.error(
                f"Error in remove_media_from_playlist_async: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to remove media from playlist: {e}",
            )

    @staticmethod
    async def get_playlist_medias_async(
        session: AsyncSession, playlist_id: int
    ) -> AResult[List[PlaylistMediaRow]]:
        try:
            stmt: Select[Tuple[PlaylistMediaRow]] = (
                select(PlaylistMediaRow)
                .where(PlaylistMediaRow.playlist_id == playlist_id)
                .order_by(PlaylistMediaRow.position)
            )
            result: Result[Tuple[PlaylistMediaRow]] = await session.execute(
                statement=stmt
            )
            medias: List[PlaylistMediaRow] = list(result.scalars().all())
            return AResult(code=AResultCode.OK, message="OK", result=medias)
        except Exception as e:
            logger.error(f"Error in get_playlist_medias_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist medias: {e}",
            )

    @staticmethod
    async def get_playlist_media_by_media_id_async(
        session: AsyncSession, playlist_id: int, media_id: int
    ) -> AResult[PlaylistMediaRow]:
        try:
            stmt: Select[Tuple[PlaylistMediaRow]] = select(PlaylistMediaRow).where(
                PlaylistMediaRow.playlist_id == playlist_id,
                PlaylistMediaRow.media_id == media_id,
            )
            result: Result[Tuple[PlaylistMediaRow]] = await session.execute(
                statement=stmt
            )
            playlist_media: PlaylistMediaRow | None = result.scalar_one_or_none()
            if not playlist_media:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Playlist media not found.",
                )
            return AResult(code=AResultCode.OK, message="OK", result=playlist_media)
        except Exception as e:
            logger.error(
                f"Error in get_playlist_media_by_media_id_async: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist media: {e}",
            )

    @staticmethod
    async def add_contributor_async(
        session: AsyncSession, playlist_id: int, user_id: int, role_key: int
    ) -> AResult[PlaylistContributorRow]:
        try:
            contributor = PlaylistContributorRow(
                playlist_id=playlist_id, user_id=user_id, role_key=role_key
            )
            session.add(instance=contributor)
            await session.commit()
            await session.refresh(instance=contributor)
            return AResult(code=AResultCode.OK, message="OK", result=contributor)
        except Exception as e:
            logger.error(f"Error in add_contributor_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to add contributor: {e}",
            )

    @staticmethod
    async def remove_contributor_async(
        session: AsyncSession, playlist_id: int, user_id: int
    ) -> AResult[bool]:
        try:
            stmt: Select[Tuple[PlaylistContributorRow]] = select(
                PlaylistContributorRow
            ).where(
                PlaylistContributorRow.playlist_id == playlist_id,
                PlaylistContributorRow.user_id == user_id,
            )
            result: Result[Tuple[PlaylistContributorRow]] = await session.execute(
                statement=stmt
            )
            contributor: PlaylistContributorRow | None = result.scalar_one_or_none()
            if not contributor:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Contributor not found."
                )
            await session.delete(instance=contributor)
            await session.commit()
            return AResult(code=AResultCode.OK, message="OK", result=True)
        except Exception as e:
            logger.error(f"Error in remove_contributor_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to remove contributor: {e}",
            )

    @staticmethod
    async def get_contributors_async(
        session: AsyncSession, playlist_id: int
    ) -> AResult[List[PlaylistContributorRow]]:
        try:
            stmt: Select[Tuple[PlaylistContributorRow]] = select(
                PlaylistContributorRow
            ).where(PlaylistContributorRow.playlist_id == playlist_id)
            result: Result[Tuple[PlaylistContributorRow]] = await session.execute(
                statement=stmt
            )
            contributors: List[PlaylistContributorRow] = list(result.scalars().all())
            return AResult(code=AResultCode.OK, message="OK", result=contributors)
        except Exception as e:
            logger.error(f"Error in get_contributors_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get contributors: {e}",
            )

    @staticmethod
    async def get_user_role_in_playlist_async(
        session: AsyncSession, playlist_id: int, user_id: int
    ) -> AResult[int]:
        try:
            stmt: Select[Tuple[PlaylistContributorRow]] = select(
                PlaylistContributorRow
            ).where(
                PlaylistContributorRow.playlist_id == playlist_id,
                PlaylistContributorRow.user_id == user_id,
            )
            result: Result[Tuple[PlaylistContributorRow]] = await session.execute(
                statement=stmt
            )
            contributor: PlaylistContributorRow | None = result.scalar_one_or_none()
            if not contributor:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="User is not a contributor."
                )
            return AResult(
                code=AResultCode.OK, message="OK", result=contributor.role_key
            )
        except Exception as e:
            logger.error(
                f"Error in get_user_role_in_playlist_async: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user role: {e}",
            )

    @staticmethod
    async def disable_media_for_user_async(
        session: AsyncSession, user_id: int, playlist_media_id: int
    ) -> AResult[UserDisabledPlaylistMediaRow]:
        try:
            disabled_media = UserDisabledPlaylistMediaRow(
                user_id=user_id, playlist_media_id=playlist_media_id
            )
            session.add(instance=disabled_media)
            await session.commit()
            await session.refresh(instance=disabled_media)
            return AResult(code=AResultCode.OK, message="OK", result=disabled_media)
        except Exception as e:
            logger.error(f"Error in disable_media_for_user_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to disable media for user: {e}",
            )

    @staticmethod
    async def enable_media_for_user_async(
        session: AsyncSession, user_id: int, playlist_media_id: int
    ) -> AResult[bool]:
        try:
            stmt: Select[Tuple[UserDisabledPlaylistMediaRow]] = select(
                UserDisabledPlaylistMediaRow
            ).where(
                UserDisabledPlaylistMediaRow.user_id == user_id,
                UserDisabledPlaylistMediaRow.playlist_media_id == playlist_media_id,
            )
            result: Result[Tuple[UserDisabledPlaylistMediaRow]] = await session.execute(
                statement=stmt
            )
            disabled_media: UserDisabledPlaylistMediaRow | None = (
                result.scalar_one_or_none()
            )
            if not disabled_media:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Disabled media not found."
                )
            await session.delete(instance=disabled_media)
            await session.commit()
            return AResult(code=AResultCode.OK, message="OK", result=True)
        except Exception as e:
            logger.error(f"Error in enable_media_for_user_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to enable media for user: {e}",
            )

    @staticmethod
    async def get_user_disabled_medias_async(
        session: AsyncSession, user_id: int, playlist_id: int
    ) -> AResult[List[int]]:
        try:
            stmt: Select[Tuple[UserDisabledPlaylistMediaRow]] = (
                select(UserDisabledPlaylistMediaRow)
                .join(PlaylistMediaRow)
                .where(
                    UserDisabledPlaylistMediaRow.user_id == user_id,
                    PlaylistMediaRow.playlist_id == playlist_id,
                )
            )
            result: Result[Tuple[UserDisabledPlaylistMediaRow]] = await session.execute(
                statement=stmt
            )
            disabled_medias: List[UserDisabledPlaylistMediaRow] = list(
                result.scalars().all()
            )
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=[dm.playlist_media_id for dm in disabled_medias],
            )
        except Exception as e:
            logger.error(f"Error in get_user_disabled_medias_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get disabled medias: {e}",
            )
