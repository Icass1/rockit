from sqlalchemy.ext.asyncio import AsyncSession

from core.framework.provider.baseProvider import BaseProvider
from core.responses.metadataResponse import MetadataResponse
from result import Result, ResultCode


class BaseMetadataProvider(BaseProvider):
    """Contract for external catalog information without playback or downloads."""

    async def search_artists_async(
        self,
        session: AsyncSession,
        name: str,
        offset: int = 0,
        limit: int = 25,
        refresh: bool = False,
    ) -> Result[MetadataResponse]:
        return Result(code=ResultCode.NOT_IMPLEMENTED, message="Search unsupported")

    async def get_metadata_async(
        self,
        session: AsyncSession,
        entity: str,
        external_id: str,
        offset: int = 0,
        limit: int = 100,
        refresh: bool = False,
    ) -> Result[MetadataResponse]:
        return Result(code=ResultCode.NOT_IMPLEMENTED, message="Metadata unsupported")
