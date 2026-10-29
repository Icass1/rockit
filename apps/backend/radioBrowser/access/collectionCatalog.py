"""Local catalog shape and membership rules owned by this provider."""

from typing import Any

from sqlalchemy import Integer, literal, select
from sqlalchemy.sql import Select
from sqlalchemy.sql.selectable import CompoundSelect

from core.access.collectionCatalog import CollectionCatalogSource, collection_catalog
from core.access.db.shared_metadata import shared_metadata


def metadata() -> Select[Any] | CompoundSelect[Any]:
    """Project names and artwork without loading collection contents."""
    station = shared_metadata.tables["radio_browser.station"]
    return select(
        station.c.id.label("id"),
        station.c.name.label("name"),
        literal(None, Integer).label("image_id"),
    )


collection_catalog.register(CollectionCatalogSource(key="radioBrowser", metadata=metadata))
