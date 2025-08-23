from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import  relationship, mapped_column

from backend.db.base import Base

from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated

from backend.db.associationTables.playlist_external_images import playlist_external_images
from backend.db.associationTables.playlist_songs import playlist_songs


class PlaylistRow(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = 'playlists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    id = mapped_column(Integer, ForeignKey('lists.id'), primary_key=True)
    public_id = mapped_column(String, nullable=False, unique=True)
    internal_image_id = mapped_column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)
    name = mapped_column(String, nullable=False)
    owner = mapped_column(String, nullable=False)
    followers = mapped_column(Integer, nullable=False, default=0)
    description = mapped_column(Text, nullable=True)

    internal_image = relationship(
        'InternalImageRow', back_populates='playlists', foreign_keys=[internal_image_id])

    external_images = relationship(
        "ExternalImageRow",
        secondary=playlist_external_images,
        back_populates="playlists"
    )
    songs = relationship(
        "SongRow",
        secondary=playlist_songs,
        back_populates="playlists"
    )

    internal_image = relationship(
        'InternalImageRow', back_populates='playlists', foreign_keys=[internal_image_id])
    
    list = relationship("ListRow", back_populates="playlist", uselist=False)
    