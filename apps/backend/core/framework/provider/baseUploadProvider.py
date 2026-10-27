from __future__ import annotations

from logging import Logger
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from core.aResult import AResult, AResultCode
from core.framework.provider.baseProvider import BaseProvider
from logger import getLogger

if TYPE_CHECKING:
    from core.requests.uploadAlbumRequest import UploadAlbumRequest
    from core.requests.uploadSongRequest import UploadSongRequest
    from core.requests.uploadVideoRequest import UploadVideoRequest
    from core.responses.uploadResponse import UploadResponse

logger: Logger = getLogger(__name__)


class BaseUploadProvider(BaseProvider):
    """Base class for upload providers (handles user-uploaded files)."""

    async def upload_song_async(
        self,
        session: AsyncSession,
        request: UploadSongRequest,
        file_path: str,
        image_path: str | None = None,
    ) -> AResult[UploadResponse]:
        logger.warning(f"Provider '{self._name}' doesn't implement upload_song_async method.")
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement upload_song_async method.",
        )

    async def upload_album_async(
        self,
        session: AsyncSession,
        request: UploadAlbumRequest,
        cover_path: str | None,
        song_paths: dict[str, str],
    ) -> AResult[UploadResponse]:
        logger.warning(f"Provider '{self._name}' doesn't implement upload_album_async method.")
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement upload_album_async method.",
        )

    async def upload_video_async(
        self,
        session: AsyncSession,
        request: UploadVideoRequest,
        file_path: str,
        image_path: str | None = None,
    ) -> AResult[UploadResponse]:
        logger.warning(f"Provider '{self._name}' doesn't implement upload_video_async method.")
        return AResult(
            code=AResultCode.NOT_IMPLEMENTED,
            message=f"Provider '{self._name}' doesn't implement upload_video_async method.",
        )
