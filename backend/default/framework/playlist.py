from logging import Logger
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.default.access.playlistAccess import PlaylistAccess
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)

CONTRIBUTOR_ROLE_OWNER = 1
CONTRIBUTOR_ROLE_EDITOR = 2
CONTRIBUTOR_ROLE_VIEWER = 3


class Playlist:
    @staticmethod
    async def _get_media_info(
        session: AsyncSession, media_id: int
    ) -> AResult[Dict[str, Any]]:
        try:
            stmt = (
                select(CoreMediaRow)
                .where(CoreMediaRow.id == media_id)
                .options(
                    selectinload(CoreMediaRow.provider),
                    selectinload(CoreMediaRow.media_type),
                )
            )
            result = await session.execute(stmt)
            media = result.scalar_one_or_none()
            if not media:
                return AResult(code=AResultCode.NOT_FOUND, message="Media not found")

            media_type_key = (
                MediaTypeEnum(media.media_type_key).name.lower()
                if media.media_type_key
                else "unknown"
            )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result={
                    "media_type": media_type_key,
                    "media_id": media.public_id,
                    "provider_id": media.provider_id,
                },
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
    ) -> AResult[Dict[str, Any]]:
        a_result_playlist = await PlaylistAccess.create_playlist_async(
            session=session,
            name=name,
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
            role_key=CONTRIBUTOR_ROLE_OWNER,
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={
                "id": playlist.id,
                "public_id": playlist.public_id,
                "name": playlist.name,
                "description": playlist.description,
                "cover_image": playlist.cover_image,
                "is_public": playlist.is_public,
                "owner_id": playlist.owner_id,
                "date_added": playlist.date_added.isoformat(),
                "date_updated": playlist.date_updated.isoformat(),
            },
        )

    @staticmethod
    async def get_playlist_async(
        session: AsyncSession, playlist_id: int, user_id: int | None = None
    ) -> AResult[Dict[str, Any]]:
        a_result_playlist = await PlaylistAccess.get_playlist_by_id_async(
            session=session, playlist_id=playlist_id
        )
        if a_result_playlist.is_not_ok():
            logger.error(
                f"Error getting playlist. {a_result_playlist.info()}", exc_info=True
            )
            return AResult(
                code=a_result_playlist.code(),
                message=a_result_playlist.message(),
            )

        playlist = a_result_playlist.result()

        if not playlist.is_public and user_id:
            a_result_role = await PlaylistAccess.get_user_role_in_playlist_async(
                session=session, playlist_id=playlist.id, user_id=user_id
            )
            if a_result_role.is_not_ok():
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Playlist not found."
                )

        a_result_medias = await PlaylistAccess.get_playlist_medias_async(
            session=session, playlist_id=playlist.id
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

        medias = a_result_medias.result()
        disabled_media_ids: List[int] = []
        if user_id:
            a_result_disabled = await PlaylistAccess.get_user_disabled_medias_async(
                session=session, user_id=user_id, playlist_id=playlist.id
            )
            if a_result_disabled.is_ok():
                disabled_media_ids = a_result_disabled.result()

        visible_medias: List[Dict[str, Any]] = []
        for m in medias:
            if m.id not in disabled_media_ids:
                media_row = await Playlist._get_media_info(
                    session=session, media_id=m.media_id
                )
                if media_row.is_ok():
                    media_info = media_row.result()
                    visible_medias.append(
                        {
                            "id": m.id,
                            "position": m.position,
                            "media_type": media_info["media_type"],
                            "media_id": media_info["media_id"],
                            "provider_id": media_info["provider_id"],
                        }
                    )

        a_result_contributors = await PlaylistAccess.get_contributors_async(
            session=session, playlist_id=playlist.id
        )
        contributors: List[Dict[str, Any]] = []
        if a_result_contributors.is_ok():
            for c in a_result_contributors.result():
                contributors.append(
                    {
                        "user_id": c.user_id,
                        "role_key": c.role_key,
                    }
                )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={
                "id": playlist.id,
                "public_id": playlist.public_id,
                "name": playlist.name,
                "description": playlist.description,
                "cover_image": playlist.cover_image,
                "is_public": playlist.is_public,
                "owner_id": playlist.owner_id,
                "date_added": playlist.date_added.isoformat(),
                "date_updated": playlist.date_updated.isoformat(),
                "medias": visible_medias,
                "contributors": contributors,
            },
        )

    @staticmethod
    async def get_user_playlists_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[Dict[str, Any]]]:
        a_result_playlists = await PlaylistAccess.get_user_playlists_async(
            session=session, user_id=user_id
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

        playlists = a_result_playlists.result()
        result_playlists: List[Dict[str, Any]] = []
        for p in playlists:
            result_playlists.append(
                {
                    "id": p.id,
                    "public_id": p.public_id,
                    "name": p.name,
                    "description": p.description,
                    "cover_image": p.cover_image,
                    "is_public": p.is_public,
                    "owner_id": p.owner_id,
                    "date_added": p.date_added.isoformat(),
                    "date_updated": p.date_updated.isoformat(),
                }
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=result_playlists,
        )

    @staticmethod
    async def update_playlist_async(
        session: AsyncSession,
        playlist_id: int,
        user_id: int,
        name: str | None = None,
        description: str | None = None,
        cover_image: str | None = None,
        is_public: bool | None = None,
    ) -> AResult[Dict[str, Any]]:
        a_result_role = await PlaylistAccess.get_user_role_in_playlist_async(
            session=session, playlist_id=playlist_id, user_id=user_id
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        role_key = a_result_role.result()
        if role_key not in [CONTRIBUTOR_ROLE_OWNER, CONTRIBUTOR_ROLE_EDITOR]:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Insufficient permissions."
            )

        a_result_playlist = await PlaylistAccess.update_playlist_async(
            session=session,
            playlist_id=playlist_id,
            name=name,
            description=description,
            cover_image=cover_image,
            is_public=is_public,
        )
        if a_result_playlist.is_not_ok():
            logger.error(
                f"Error updating playlist. {a_result_playlist.info()}", exc_info=True
            )
            return AResult(
                code=a_result_playlist.code(),
                message=a_result_playlist.message(),
            )

        playlist = a_result_playlist.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={
                "id": playlist.id,
                "public_id": playlist.public_id,
                "name": playlist.name,
                "description": playlist.description,
                "cover_image": playlist.cover_image,
                "is_public": playlist.is_public,
                "owner_id": playlist.owner_id,
                "date_added": playlist.date_added.isoformat(),
                "date_updated": playlist.date_updated.isoformat(),
            },
        )

    @staticmethod
    async def delete_playlist_async(
        session: AsyncSession, playlist_id: int, user_id: int
    ) -> AResult[bool]:
        a_result_role = await PlaylistAccess.get_user_role_in_playlist_async(
            session=session, playlist_id=playlist_id, user_id=user_id
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        if a_result_role.result() != CONTRIBUTOR_ROLE_OWNER:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Only owner can delete playlist."
            )

        a_result = await PlaylistAccess.delete_playlist_async(
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
        playlist_id: int,
        user_id: int,
        media_public_id: str,
    ) -> AResult[Dict[str, Any]]:
        a_result_role = await PlaylistAccess.get_user_role_in_playlist_async(
            session=session, playlist_id=playlist_id, user_id=user_id
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        role_key = a_result_role.result()
        if role_key not in [CONTRIBUTOR_ROLE_OWNER, CONTRIBUTOR_ROLE_EDITOR]:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Insufficient permissions."
            )

        stmt = select(CoreMediaRow).where(CoreMediaRow.public_id == media_public_id)
        result = await session.execute(stmt)
        media_row: CoreMediaRow | None = result.scalar_one_or_none()
        if not media_row:
            return AResult(code=AResultCode.NOT_FOUND, message="Media not found")

        a_result = await PlaylistAccess.add_media_to_playlist_async(
            session=session,
            playlist_id=playlist_id,
            media_id=media_row.id,
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
        media_type_key = (
            MediaTypeEnum(media_row.media_type_key).name.lower()
            if media_row.media_type_key
            else "unknown"
        )
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={
                "id": playlist_media.id,
                "position": playlist_media.position,
                "media_type": media_type_key,
                "media_id": media_row.public_id,
                "provider_id": media_row.provider_id,
            },
        )

    @staticmethod
    async def remove_media_from_playlist_async(
        session: AsyncSession, playlist_media_id: int, user_id: int
    ) -> AResult[bool]:
        return AResult(code=AResultCode.NOT_IMPLEMENTED, message="Not implemented")

    @staticmethod
    async def add_contributor_async(
        session: AsyncSession,
        playlist_id: int,
        owner_id: int,
        new_user_id: int,
        role_key: int,
    ) -> AResult[Dict[str, Any]]:
        a_result_role = await PlaylistAccess.get_user_role_in_playlist_async(
            session=session, playlist_id=playlist_id, user_id=owner_id
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        if a_result_role.result() != CONTRIBUTOR_ROLE_OWNER:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Only owner can add contributors."
            )

        a_result = await PlaylistAccess.add_contributor_async(
            session=session,
            playlist_id=playlist_id,
            user_id=new_user_id,
            role_key=role_key,
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding contributor. {a_result.info()}", exc_info=True)
            return AResult(
                code=a_result.code(),
                message=a_result.message(),
            )

        contributor = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={
                "user_id": contributor.user_id,
                "role_key": contributor.role_key,
            },
        )

    @staticmethod
    async def remove_contributor_async(
        session: AsyncSession, playlist_id: int, owner_id: int, target_user_id: int
    ) -> AResult[bool]:
        a_result_role = await PlaylistAccess.get_user_role_in_playlist_async(
            session=session, playlist_id=playlist_id, user_id=owner_id
        )
        if a_result_role.is_not_ok():
            return AResult(
                code=AResultCode.NOT_FOUND,
                message="Playlist not found or access denied.",
            )

        if a_result_role.result() != CONTRIBUTOR_ROLE_OWNER:
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Only owner can remove contributors.",
            )

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
        session: AsyncSession, user_id: int, playlist_media_id: int
    ) -> AResult[bool]:
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
        session: AsyncSession, user_id: int, playlist_media_id: int
    ) -> AResult[bool]:
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
