"""Compose provider-owned access operations without knowing their schemas.

Registration follows database discovery, so local files remain available even
when a provider's remote integration is disabled.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select, literal, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

logger = getLogger(__name__)


@dataclass(frozen=True)
class MediaStorage:
    """Narrow SQL projections and optional batch mutation supplied by a provider.

    Metadata projects id, name, image_id, external_id, manageable; files projects
    id, path, name. IDs are shared core media IDs. Keys are opaque registration
    identifiers, never interpreted as table names by core.
    """

    key: str
    metadata_statement: Callable[[bool], Select[Any]]
    files_statement: Callable[[], Select[Any]] | None = None
    clear_files_async: (
        Callable[[AsyncSession, list[int]], Awaitable[AResult[list[str]]]] | None
    ) = None


class ProviderStorage:
    def __init__(self):
        self.sources: dict[str, MediaStorage] = {}

    def register(self, *sources: MediaStorage) -> None:
        for source in sources:
            self.sources[source.key] = source

    def metadata(self, with_images: bool = True):
        statements = [
            source.metadata_statement(with_images) for source in self.sources.values()
        ]
        if not statements:
            statements = [
                select(
                    literal(None).label("id"),
                    literal(None).label("name"),
                    literal(None).label("image_id"),
                    literal(None).label("external_id"),
                    literal(False).label("manageable"),
                ).where(literal(False))
            ]
        return union_all(*statements).subquery("download_metadata")

    def files(self):
        statements = [
            source.files_statement()
            for source in self.sources.values()
            if source.files_statement is not None
        ]
        if not statements:
            statements = [
                select(
                    literal(None).label("id"),
                    literal(None).label("path"),
                    literal(None).label("name"),
                ).where(literal(False))
            ]
        return union_all(*statements).subquery("download_files")

    async def clear_files_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> AResult[list[str]]:
        """Dispatch batch mutations; the caller owns the shared transaction."""
        paths: list[str] = []
        if not media_ids:
            return AResult(code=AResultCode.OK, message="OK", result=paths)
        for source in self.sources.values():
            if source.clear_files_async is None:
                continue
            result = await source.clear_files_async(session, media_ids)
            if result.is_not_ok():
                logger.error(
                    f"Could not clear local files for {source.key}: {result.info()}"
                )
                return AResult(code=result.code(), message=result.message())
            paths.extend(result.result())
        return AResult(code=AResultCode.OK, message="OK", result=paths)


provider_storage = ProviderStorage()
