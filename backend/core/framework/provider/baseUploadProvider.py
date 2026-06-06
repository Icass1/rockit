from __future__ import annotations

from logging import Logger
from typing import TYPE_CHECKING
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.framework.provider.baseProvider import BaseProvider

if TYPE_CHECKING:
    from backend.core.requests.uploadSongRequest import UploadSongRequest
    from backend.core.requests.uploadAlbumRequest import UploadAlbumRequest
    from backend.core.requests.uploadVideoRequest import UploadVideoRequest
    from backend.core.responses.uploadResponse import UploadResponse

logger: Logger = getLogger(__name__)


class BaseUploadProvider(BaseProvider):
    """Base class for upload providers (handles user-uploaded files)."""

    async def upload_song_async(
        self,
        session: AsyncSession,
        request: UploadSongRequest,
        file_data: bytes,
    ) -> AResult[UploadResponse]:
        logger.warning(
            f"Provider '{self._name}' doesn't implement upload_song_async method."
        )
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement upload_song_async method.",
        )

    async def upload_album_async(
        self,
        session: AsyncSession,
        request: UploadAlbumRequest,
        cover_data: bytes | None,
        song_files: dict[str, bytes],
    ) -> AResult[UploadResponse]:
        logger.warning(
            f"Provider '{self._name}' doesn't implement upload_album_async method."
        )
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement upload_album_async method.",
        )

    async def upload_video_async(
        self,
        session: AsyncSession,
        request: UploadVideoRequest,
        file_data: bytes,
    ) -> AResult[UploadResponse]:
        logger.warning(
            f"Provider '{self._name}' doesn't implement upload_video_async method."
        )
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement upload_video_async method.",
        )
