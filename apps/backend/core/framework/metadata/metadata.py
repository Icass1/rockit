from sqlalchemy.ext.asyncio import AsyncSession

from core.framework import providers
from core.framework.provider.baseMetadataProvider import BaseMetadataProvider
from core.responses.metadataResponse import MetadataResponse
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class Metadata:
    @staticmethod
    def _provider(name: str) -> BaseMetadataProvider | None:
        """Select a registered information provider without knowing its implementation."""
        return next(
            (
                p
                for p in providers.get_metadata_providers()
                if p.get_name().casefold() == name.casefold()
            ),
            None,
        )

    @staticmethod
    async def search_artists_async(
        session: AsyncSession,
        provider: str,
        name: str,
        offset: int,
        limit: int,
        refresh: bool = False,
    ) -> Result[MetadataResponse]:
        """Delegate identity discovery to the selected provider."""
        source = Metadata._provider(name=provider)
        if source is None:
            logger.warning("Metadata provider unavailable: %s", provider)
            return Result(code=ResultCode.NOT_FOUND, message="Metadata provider unavailable")
        return await source.search_artists_async(
            session=session, name=name, offset=offset, limit=limit, refresh=refresh
        )

    @staticmethod
    async def get_async(
        session: AsyncSession,
        provider: str,
        entity: str,
        external_id: str,
        offset: int,
        limit: int,
        refresh: bool,
    ) -> Result[MetadataResponse]:
        """Core only dispatches; source identity, caching and HTTP stay in providers."""
        source = Metadata._provider(name=provider)
        if source is None:
            logger.warning("Metadata provider unavailable: %s", provider)
            return Result(code=ResultCode.NOT_FOUND, message="Metadata provider unavailable")
        return await source.get_metadata_async(
            session=session,
            entity=entity,
            external_id=external_id,
            offset=offset,
            limit=limit,
            refresh=refresh,
        )
