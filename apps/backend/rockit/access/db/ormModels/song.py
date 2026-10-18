from sqlalchemy.orm import relationship
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from typing import Dict, List, TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Index
from sqlalchemy.orm import mapped_column, Mapped

from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)

from backend.rockit.access.db.base import RockitBase
from backend.rockit.access.db.associationTables.song_artists import song_artists

if TYPE_CHECKING:
    from backend.rockit.access.db.ormModels.album import RockitAlbumRow
    from backend.rockit.access.db.ormModels.artist import RockitArtistRow


class RockitSongRow(RockitBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "song"
    __table_args__ = (
        Index(
            "ix_collection_rockit_album_order",
            "album_id",
            "disc_number",
            "track_number",
            "id",
        ),
        Index(
            "ix_rockit_song_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        {"schema": "rockit", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_object_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("core.storage_object.id"), nullable=True
    )
    storage_object: Mapped[StorageObjectRow | None] = relationship(
        StorageObjectRow, lazy="selectin"
    )
    image_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.image.id"), nullable=False
    )
    album_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("rockit.album.id"), nullable=True
    )
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False)

    album: Mapped["RockitAlbumRow | None"] = relationship(
        "RockitAlbumRow", back_populates="songs"
    )

    artists: Mapped[List["RockitArtistRow"]] = relationship(
        "RockitArtistRow",
        secondary=song_artists,
        back_populates="songs",
    )

    def __init__(
        self,
        id: int,
        name: str,
        duration_ms: int,
        image_id: int,
        disc_number: int,
        track_number: int,
        storage_object_id: int | None = None,
        album_id: int | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["duration_ms"] = duration_ms
        kwargs["image_id"] = image_id
        kwargs["disc_number"] = disc_number
        kwargs["track_number"] = track_number
        kwargs["storage_object_id"] = storage_object_id
        kwargs["album_id"] = album_id
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def file_path(self) -> str | None:
        """Internal locator derived from the storage object, never a filesystem path."""
        return self.storage_object.uri if self.storage_object is not None else None
