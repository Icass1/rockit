from sqlalchemy.ext.asyncio import AsyncSession

from core.aResult import AResult, AResultCode
from core.framework.provider.baseProvider import BaseProvider
from core.responses.metadataResponse import MetadataResponse


class BaseMetadataProvider(BaseProvider):
    """Contract for external catalog information without playback or downloads."""

    async def search_artists_async(
        self,
        session: AsyncSession,
        name: str,
        offset: int = 0,
        limit: int = 25,
        refresh: bool = False,
    ) -> AResult[MetadataResponse]:
        return AResult(code=AResultCode.NOT_IMPLEMENTED, message="Search unsupported")

    async def get_metadata_async(
        self,
        session: AsyncSession,
        entity: str,
        external_id: str,
        offset: int = 0,
        limit: int = 100,
        refresh: bool = False,
    ) -> AResult[MetadataResponse]:
        return AResult(code=AResultCode.NOT_IMPLEMENTED, message="Metadata unsupported")
