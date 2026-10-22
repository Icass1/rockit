"""Provider-owned local storage declarations, registered during database discovery.

This access-layer registry has no dependency on framework or concrete providers.
Disabled providers retain local metadata and file access without remote API calls.
"""

from dataclasses import dataclass
from typing import Any

from sqlalchemy import select, literal, union_all
from sqlalchemy.sql import Select

from backend.core.access.db.shared_metadata import shared_metadata


@dataclass(frozen=True)
class MediaStorage:
    table: str
    name: str = "name"
    image: str | None = "image_id"
    external_id: str | None = None
    path: str | None = None
    album_table: str | None = None
    manageable: bool = False

    def metadata_statement(self, with_images: bool) -> Select[Any]:
        table = shared_metadata.tables[self.table]
        source = table
        image = table.c[self.image] if self.image else literal(None)
        if with_images and self.album_table:
            album = shared_metadata.tables[self.album_table]
            source = table.outerjoin(album, album.c.id == table.c.album_id)
            image = album.c.image_id
        return select(
            table.c.id.label("id"),
            table.c[self.name].label("name"),
            (image if with_images else literal(None)).label("image_id"),
            (table.c[self.external_id] if self.external_id else literal(None)).label(
                "external_id"
            ),
            literal(self.manageable).label("manageable"),
        ).select_from(source)

    def files_statement(self) -> Select[Any]:
        assert self.path is not None
        table = shared_metadata.tables[self.table]
        return select(
            table.c.id.label("id"),
            table.c[self.path].label("path"),
            table.c[self.name].label("name"),
        )


class ProviderStorage:
    def __init__(self):
        self.sources: dict[str, MediaStorage] = {}

    def register(self, *sources: MediaStorage) -> None:
        for source in sources:
            self.sources[source.table] = source

    def available(self) -> list[MediaStorage]:
        return [
            source
            for source in self.sources.values()
            if source.table in shared_metadata.tables
        ]

    def metadata(self, with_images: bool = True):
        statements = [
            source.metadata_statement(with_images) for source in self.available()
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
            source.files_statement() for source in self.available() if source.path
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


provider_storage = ProviderStorage()
