from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.framework import providers
from backend.core.framework.provider.baseMetadataProvider import BaseMetadataProvider
from backend.core.responses.metadataResponse import MetadataResponse

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
    ) -> AResult[MetadataResponse]:
        """Delegate identity discovery to the selected provider."""
        source = Metadata._provider(name=provider)
        if source is None:
            logger.warning("Metadata provider unavailable: %s", provider)
            return AResult(
                code=AResultCode.NOT_FOUND, message="Metadata provider unavailable"
            )
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
    ) -> AResult[MetadataResponse]:
        """Core only dispatches; source identity, caching and HTTP stay in providers."""
        source = Metadata._provider(name=provider)
        if source is None:
            logger.warning("Metadata provider unavailable: %s", provider)
            return AResult(
                code=AResultCode.NOT_FOUND, message="Metadata provider unavailable"
            )
        return await source.get_metadata_async(
            session=session,
            entity=entity,
            external_id=external_id,
            offset=offset,
            limit=limit,
            refresh=refresh,
        )
