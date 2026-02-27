from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResultCode


class BaseDownload:
    public_id: str
    download_id: int

    def __init__(self, public_id: str, download_id: int) -> None:
        """Store the public_id and download row id for this download."""

        self.public_id = public_id
        self.download_id = download_id

    def download_method(self, session: AsyncSession) -> None:
        """Execute the download. Override in provider-specific subclasses."""

        pass

    async def download_method_async(self, session: AsyncSession) -> AResultCode:
        """Return a descriptive thread name for this download."""

        return AResultCode(
            AResultCode.NOT_IMPLEMENTED,
            f"download_method_async not implemented in {self}",
        )
