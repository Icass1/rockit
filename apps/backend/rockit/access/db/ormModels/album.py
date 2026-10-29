from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
)
from rockit.access.db.associationTables.album_artists import album_artists
from rockit.access.db.base import RockitBase

if TYPE_CHECKING:
    from rockit.access.db.ormModels.artist import RockitArtistRow
    from rockit.access.db.ormModels.song import RockitSongRow


class RockitAlbumRow(RockitBase, TableDateUpdated, TableDateAdded):
    __tablename__ = "album"
    __table_args__ = (
        Index(
            "ix_rockit_album_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
        {"schema": "rockit", "extend_existing": True},
    )

    id: Mapped[int] = mapped_column(Integer, ForeignKey("core.media.id"), primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    release_date: Mapped[str] = mapped_column(String, nullable=False)
    image_id: Mapped[int] = mapped_column(Integer, ForeignKey("core.image.id"), nullable=False)

    songs: Mapped[list["RockitSongRow"]] = relationship(
        "RockitSongRow",
        back_populates="album",
        order_by="RockitSongRow.disc_number, RockitSongRow.track_number",
    )

    artists: Mapped[list["RockitArtistRow"]] = relationship(
        "RockitArtistRow",
        secondary=album_artists,
        back_populates="albums",
    )

    def __init__(self, id: int, name: str, release_date: str, image_id: int) -> None:
        kwargs: dict[str, int | str] = {}
        kwargs["id"] = id
        kwargs["name"] = name
        kwargs["release_date"] = release_date
        kwargs["image_id"] = image_id
        for k, v in kwargs.items():
            setattr(self, k, v)
