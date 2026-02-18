from typing import Final, TYPE_CHECKING, Literal, Dict

from sqlalchemy import Enum, String, UniqueConstraint
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableAutoincrementId, TableDateAdded, TableDateUpdated
from backend.spotify.access.db.associationTables.album_copyrights import album_copyrights

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.album import AlbumRow

COPYRIGHT_TYPES: Final[tuple[str, ...]] = (
    "C",
    "P"
)

COPYRIGHT_TYPE_TYPE = Literal[
    "C",
    "P"
]


class CopyrightRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "copyright"

    __table_args__ = (
        UniqueConstraint(
            "text", "type", name="copyrights_unique_group_text_type"),
        {"schema": "spotify", "extend_existing": True},
    )

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    text: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[COPYRIGHT_TYPE_TYPE] = mapped_column(
        Enum(*COPYRIGHT_TYPES,
              name="copyrights_type_enum",
                                                      schema="spotify"), nullable=False)

    albums: Mapped["AlbumRow"] = relationship(
        "AlbumRow", secondary=album_copyrights, back_populates="copyrights")

    def __init__(self, public_id: str, text: str, type: COPYRIGHT_TYPE_TYPE):
        kwargs: Dict[str, COPYRIGHT_TYPE_TYPE | str] = {}
        kwargs['public_id'] = public_id
        kwargs['text'] = text
        kwargs['type'] = type
        for k, v in kwargs.items():
            setattr(self, k, v)
