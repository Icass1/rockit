from typing import TYPE_CHECKING, Dict

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.spotify.access.db.base import SpotifyBase
from backend.core.access.db.ormModels.declarativeMixin import TableAutoincrementId, TableDateAdded, TableDateUpdated
from backend.spotify.access.db.associationTables.album_copyrights import album_copyrights

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.album import AlbumRow
    from backend.spotify.access.db.ormEnums.copyrightTypeEnum import CopyrightTypeEnumRow


class CopyrightRow(SpotifyBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "copyright"

    __table_args__ = {"schema": "spotify", "extend_existing": True}

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    text: Mapped[str] = mapped_column(String, nullable=False)
    type_key: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('spotify.copyright_type_enum.key'),
        nullable=False)
    albums: Mapped["AlbumRow"] = relationship(
        "AlbumRow",
        secondary=album_copyrights)

    type: Mapped["CopyrightTypeEnumRow"] = relationship(
        "CopyrightTypeEnumRow")
    
    def __init__(self, public_id: str, text: str, type_key: int):
        kwargs: Dict[str, int | str] = {}
        kwargs['public_id'] = public_id
        kwargs['text'] = text
        kwargs['type_key'] = type_key
        for k, v in kwargs.items():
            setattr(self, k, v)
