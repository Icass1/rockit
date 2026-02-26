from typing import List, Tuple

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

from backend.core.access.userAccess import UserAccess

from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.provider import ProviderRow
from backend.core.access.db.ormModels.user_album import UserAlbumRow

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework import providers

from backend.core.responses.queueResponse import QueueResponse
from backend.core.responses.baseAlbumResponse import BaseAlbumResponse

logger = getLogger(__name__)


class User:

    @staticmethod
    def get_user_queue(user_id: int) -> AResult[QueueResponse]:

        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message="Get user queue is not implemented",
        )

    @staticmethod
    async def get_user_albums(user_id: int) -> AResult[List[BaseAlbumResponse]]:
        """Get all albums for a user."""

        a_result_albums: AResult[
            List[Tuple[UserAlbumRow, CoreAlbumRow, ProviderRow]]
        ] = await UserAccess.get_user_albums(user_id=user_id)

        if a_result_albums.is_not_ok():
            logger.error(f"Error getting user albums. {a_result_albums.info()}")
            return AResult(
                code=a_result_albums.code(), message=a_result_albums.message()
            )

        albums: List[BaseAlbumResponse] = []
        for _, album, provider in a_result_albums.result():
            provider_instance: BaseProvider | None = providers.find_provider(
                provider_id=provider.id
            )
            if provider_instance is None:
                logger.error(f"No provider found for provider_id {provider.id}.")
                continue

            a_result_album: AResult[BaseAlbumResponse] = (
                await provider_instance.get_album_async(public_id=album.public_id)
            )
            if a_result_album.is_not_ok():
                logger.error(
                    f"Error getting album from provider. {a_result_album.info()}"
                )
                continue

            albums.append(a_result_album.result())

        return AResult(code=AResultCode.OK, message="OK", result=albums)
