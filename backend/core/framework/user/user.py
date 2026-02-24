from typing import List, Tuple

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

from backend.core.access.userAccess import UserAccess

from backend.core.access.db.ormModels.user_album import UserAlbumRow
from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.provider import ProviderRow

from backend.core.responses.queueResponse import QueueResponse
from backend.core.responses.baseAlbumResponse import BaseAlbumResponse

logger = getLogger(__name__)


class User:

    @staticmethod
    def get_user_queue(user_id: int) -> AResult[QueueResponse]:

        return AResult(code=AResultCode.NOT_IMPLEMENTED, message="Get user queue is not implemented")

    @staticmethod
    async def get_user_albums(user_id: int) -> AResult[List[BaseAlbumResponse]]:
        """Get all albums for a user."""

        a_result_albums: AResult[
            List[Tuple[UserAlbumRow, CoreAlbumRow, ProviderRow]]
        ] = await UserAccess.get_user_albums(user_id=user_id)

        if a_result_albums.is_not_ok():
            logger.error(f"Error getting user albums. {a_result_albums.info()}")
            return AResult(
                code=a_result_albums.code(),
                message=a_result_albums.message()
            )

        albums: List[BaseAlbumResponse] = []
        for _, album, provider in a_result_albums.result():
            albums.append(BaseAlbumResponse(
                provider=provider.name,
                publicId=album.public_id,
                name=album.public_id
            ))

        return AResult(code=AResultCode.OK, message="OK", result=albums)
