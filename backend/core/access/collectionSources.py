"""Access-layer extension points for provider-specific collection rules."""

from __future__ import annotations
from typing import TYPE_CHECKING, Any, Protocol
from collections.abc import Awaitable
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select
from backend.core.aResult import AResult

if TYPE_CHECKING:
    from backend.core.framework.models.collection import (
        CollectionRecord,
        CollectionEntry,
    )


class CollectionSource(Protocol):
    def visible(self, user_id: int) -> Any: ...
    def filter_edges(
        self, statement: Select[Any], table: Table, user_id: int
    ) -> Select[Any]: ...
    def enrich_async(
        self,
        session: AsyncSession,
        records: dict[int, CollectionRecord],
        collection_ids: list[int],
    ) -> Awaitable[AResult[bool]]: ...
    def expanded_async(
        self, session: AsyncSession, entries: list[CollectionEntry], user_id: int
    ) -> Awaitable[AResult[dict[tuple[int, int], bool]]]: ...


collection_sources: list[CollectionSource] = []
