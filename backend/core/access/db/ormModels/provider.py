from typing import TYPE_CHECKING, Dict, List

from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.song import CoreSongRow
    from backend.core.access.db.ormModels.album import CoreAlbumRow
    from backend.core.access.db.ormModels.artist import CoreArtistRow
    from backend.core.access.db.ormModels.playlist import CorePlaylistRow
    from backend.core.access.db.ormModels.video import CoreVideoRow


class ProviderRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'provider'
    __table_args__ = {'schema': 'core', 'extend_existing': True},

    name: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True)

    module: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True)

    songs: Mapped[List["CoreSongRow"]] = relationship(
        "CoreSongRow",
        back_populates="provider",
        uselist=True
    )

    albums: Mapped[List["CoreAlbumRow"]] = relationship(
        "CoreAlbumRow",
        back_populates="provider",
        uselist=True
    )

    artists: Mapped[List["CoreArtistRow"]] = relationship(
        "CoreArtistRow",
        back_populates="provider",
        uselist=True
    )

    playlists: Mapped[List["CorePlaylistRow"]] = relationship(
        "CorePlaylistRow",
        back_populates="provider",
        uselist=True
    )

    videos: Mapped[List["CoreVideoRow"]] = relationship(
        "CoreVideoRow",
        back_populates="provider",
        uselist=True
    )

    def __init__(self, name: str, module: str):
        kwargs: Dict[str, str] = {}
        kwargs['name'] = name
        kwargs['module'] = module
        for k, v in kwargs.items():
            setattr(self, k, v)
