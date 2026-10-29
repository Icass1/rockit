from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.access.db.ormModels.declarativeMixin import (
    TableAutoincrementId,
    TableDateAdded,
    TableDateUpdated,
)
from spotify.access.db.associationTables.album_copyrights import (
    album_copyrights,
)
from spotify.access.db.base import SpotifyBase

if TYPE_CHECKING:
    from spotify.access.db.ormEnums.copyrightTypeEnum import (
        CopyrightTypeEnumRow,
    )
    from spotify.access.db.ormModels.album import AlbumRow


class CopyrightRow(SpotifyBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "copyright"

    __table_args__ = {"schema": "spotify", "extend_existing": True}

    text: Mapped[str] = mapped_column(String, nullable=False)
    type_key: Mapped[int] = mapped_column(
        Integer, ForeignKey("spotify.copyright_type_enum.key"), nullable=False
    )
    albums: Mapped["AlbumRow"] = relationship("AlbumRow", secondary=album_copyrights)

    type: Mapped["CopyrightTypeEnumRow"] = relationship("CopyrightTypeEnumRow")

    def __init__(self, text: str, type_key: int, id: int | None = None) -> None:
        kwargs: dict[str, None | int | str] = {}
        kwargs["text"] = text
        kwargs["type_key"] = type_key
        if id is not None:
            kwargs["id"] = id
        for k, v in kwargs.items():
            setattr(self, k, v)
