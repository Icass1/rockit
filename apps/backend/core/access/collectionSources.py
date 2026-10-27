"""Access-layer extension points for provider-specific collection rules."""

from __future__ import annotations

from collections.abc import Awaitable
from typing import TYPE_CHECKING, Any, Protocol

from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ColumnElement, Select

from core.aResult import AResult

if TYPE_CHECKING:
    from core.framework.models.collection import (
        CollectionEntry,
        CollectionRecord,
    )


class CollectionSource(Protocol):
    def visible(self, user_id: int) -> ColumnElement[bool]: ...
    def filter_edges(self, statement: Select[Any], table: Table, user_id: int) -> Select[Any]: ...
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
