from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from core.access.db.ormModels.storageObject import StorageObjectRow
from rockit.access.db.associationTables.song_artists import song_artists
from rockit.access.db.base import RockitBase

if TYPE_CHECKING:
    from rockit.access.db.ormModels.album import RockitAlbumRow
    from rockit.access.db.ormModels.artist import RockitArtistRow


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

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_object_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.storage_object.id"), nullable=False
    )
    storage_object: Mapped["StorageObjectRow"] = relationship(StorageObjectRow, lazy="selectin")
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)
    album_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("rockit.album.id"), nullable=True
    )
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False)

    album: Mapped["RockitAlbumRow | None"] = relationship("RockitAlbumRow", back_populates="songs")

    artists: Mapped[list["RockitArtistRow"]] = relationship(
        "RockitArtistRow",
        secondary=song_artists,
        back_populates="songs",
    )

    def __init__(
        self,
        id: int,
        name: str,
        duration_ms: int,
        storage_object_id: int,
        image_id: int,
        disc_number: int,
        track_number: int,
        album_id: int | None = None,
    ) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["duration_ms"] = duration_ms
        kwargs["storage_object_id"] = storage_object_id
        kwargs["image_id"] = image_id
        kwargs["disc_number"] = disc_number
        kwargs["track_number"] = track_number
        kwargs["album_id"] = album_id
        for k, v in kwargs.items():
            setattr(self, k, v)
