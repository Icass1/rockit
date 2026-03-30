from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow
from backend.core.access.downloadAccess import DownloadAccess
from backend.core.framework.websocket.webSocketManager import ws_manager
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class BaseDownload:
    public_id: str
    download_id: int
    download_group_id: int
    user_id: int

    def __init__(
        self, public_id: str, download_id: int, download_group_id: int, user_id: int
    ) -> None:
        """Store the public_id and download row id for this download."""

        self.public_id = public_id
        self.download_id = download_id
        self.download_group_id = download_group_id
        self.user_id = user_id

    def download_method(self, session: AsyncSession) -> None:
        """Execute the download. Override in provider-specific subclasses."""

        pass

    async def progress_callback(
        self, session: AsyncSession, progress: float, status: str
    ):
        """TODO."""

        message = f"{status}: {progress:.1f}%"

        a_result: AResult[DownloadStatusRow] = (
            await DownloadAccess.create_download_status(
                session=session,
                download_id=self.download_id,
                completed=progress,
                message=message,
            )
        )

        if a_result.is_not_ok():
            logger.error(f"Error inserting download status. {a_result.info()}")

        await ws_manager.broadcast_progress(
            user_id=self.user_id,
            download_id=self.download_id,
            status=status,
            progress=progress,
            message=message,
        )

    async def download_method_async(self, session: AsyncSession) -> AResultCode:
        """Return a descriptive thread name for this download."""

        return AResultCode(
            AResultCode.NOT_IMPLEMENTED,
            f"download_method_async not implemented in {self}",
        )
