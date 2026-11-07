"""Provider-owned local collection projections, registered during database discovery."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy import DateTime, Integer, String, literal, select, union_all
from sqlalchemy.sql import Select
from sqlalchemy.sql.selectable import CompoundSelect, Subquery


@dataclass(frozen=True)
class CollectionCatalogSource:
    """IDs are shared media IDs; keys are opaque and never interpreted as schemas."""

    key: str
    metadata: Callable[[], Select[Any] | CompoundSelect[Any]]
    edges: Callable[[int], Select[Any] | CompoundSelect[Any]] | None = None
    details: Callable[[], Select[Any] | CompoundSelect[Any]] | None = None
    artists: Callable[[], Select[Any] | CompoundSelect[Any]] | None = None


class CollectionCatalog:
    def __init__(self) -> None:
        self.sources: dict[str, CollectionCatalogSource] = {}

    def register(self, source: CollectionCatalogSource) -> None:
        self.sources[source.key] = source

    def metadata(self) -> Subquery:
        statements = [s.metadata() for s in self.sources.values()]
        if not statements:
            statements = [
                select(
                    literal(None, Integer).label("id"),
                    literal(None, String).label("name"),
                    literal(None, Integer).label("image_id"),
                ).where(literal(False))
            ]
        return union_all(*[select(statement.subquery()) for statement in statements]).subquery(
            "collection_metadata"
        )

    def edges(self, user_id: int) -> Subquery:
        statements = [s.edges(user_id) for s in self.sources.values() if s.edges is not None]
        if not statements:
            statements = [
                select(
                    literal(None, Integer).label("parent_id"),
                    literal(None, Integer).label("media_id"),
                    literal(None, Integer).label("position"),
                    literal(None, DateTime).label("added_at"),
                ).where(literal(False))
            ]
        return union_all(*[select(statement.subquery()) for statement in statements]).subquery(
            "registered_edges"
        )

    def details(self) -> Subquery:
        statements = [s.details() for s in self.sources.values() if s.details is not None]
        if not statements:
            statements = [
                select(
                    *[
                        literal(
                            None, Integer if key in {"id", "image_id", "owner_id"} else String
                        ).label(key)
                        for key in (
                            "id",
                            "image_id",
                            "external_id",
                            "release_date",
                            "description",
                            "owner_id",
                            "owner",
                        )
                    ]
                ).where(literal(False))
            ]
        return union_all(*[select(statement.subquery()) for statement in statements]).subquery(
            "collection_details"
        )

    def artists(self) -> Subquery:
        statements = [s.artists() for s in self.sources.values() if s.artists is not None]
        if not statements:
            statements = [
                select(
                    literal(None, Integer).label("parent_id"),
                    literal(None, Integer).label("artist_id"),
                    literal(None, String).label("name"),
                    literal(None, Integer).label("image_id"),
                    literal(None, String).label("provider"),
                ).where(literal(False))
            ]
        return union_all(*[select(statement.subquery()) for statement in statements]).subquery(
            "collection_artists"
        )


collection_catalog = CollectionCatalog()
