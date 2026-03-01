from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.utils.logger import getLogger

from backend.core.access.userAccess import UserAccess
from backend.core.access.mediaAccess import MediaAccess

from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.provider import ProviderRow
from backend.core.access.db.ormModels.user_album import UserAlbumRow

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework import providers

from backend.core.responses.queueResponse import QueueResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse

logger = getLogger(__name__)


class User:
    @staticmethod
    def get_user_queue(user_id: int) -> AResult[QueueResponse]:
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=QueueResponse(currentQueueSongId=None, queue=[]),
        )

    @staticmethod
    async def get_user_albums(
        session: AsyncSession, user_id: int
    ) -> AResult[List[BaseAlbumWithoutSongsResponse]]:
        """Get all albums for a user."""

        a_result_albums: AResult[
            List[Tuple[UserAlbumRow, CoreAlbumRow, ProviderRow]]
        ] = await UserAccess.get_user_albums(session=session, user_id=user_id)

        if a_result_albums.is_not_ok():
            logger.error(f"Error getting user albums. {a_result_albums.info()}")
            return AResult(
                code=a_result_albums.code(), message=a_result_albums.message()
            )

        albums: List[BaseAlbumWithoutSongsResponse] = []
        for _, album, provider in a_result_albums.result():
            provider_instance: BaseProvider | None = providers.find_provider(
                provider_id=provider.id
            )
            if provider_instance is None:
                logger.error(f"No provider found for provider_id {provider.id}.")
                continue

            a_result_album: AResult[BaseAlbumWithSongsResponse] = (
                await provider_instance.get_album_async(
                    session=session, public_id=album.public_id
                )
            )
            if a_result_album.is_not_ok():
                logger.error(
                    f"Error getting album from provider. {a_result_album.info()}"
                )
                continue

            albums.append(a_result_album.result())

        return AResult(code=AResultCode.OK, message="OK", result=albums)

    @staticmethod
    async def add_album_to_library(
        session: AsyncSession, user_id: int, album_public_id: str
    ) -> AResult[UserAlbumRow]:
        """Add an album to user's library by public_id."""

        a_result_album: AResult[CoreAlbumRow] = (
            await MediaAccess.get_album_from_public_id_async(
                session=session, public_id=album_public_id
            )
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        a_result_user_album: AResult[UserAlbumRow] = await UserAccess.add_user_album(
            session=session, user_id=user_id, album_id=a_result_album.result().id
        )
        if a_result_user_album.is_not_ok():
            logger.error(f"Error adding album to library. {a_result_user_album.info()}")
            return AResult(
                code=a_result_user_album.code(), message=a_result_user_album.message()
            )

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_user_album.result()
        )

    @staticmethod
    async def remove_album_from_library(
        session: AsyncSession, user_id: int, album_public_id: str
    ) -> AResult[bool]:
        """Remove an album from user's library by public_id."""

        a_result_album: AResult[CoreAlbumRow] = (
            await MediaAccess.get_album_from_public_id_async(
                session=session, public_id=album_public_id
            )
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        a_result_removed: AResult[bool] = await UserAccess.remove_user_album(
            session=session, user_id=user_id, album_id=a_result_album.result().id
        )
        if a_result_removed.is_not_ok():
            logger.error(
                f"Error removing album from library. {a_result_removed.info()}"
            )
            return AResult(
                code=a_result_removed.code(), message=a_result_removed.message()
            )

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_removed.result()
        )
