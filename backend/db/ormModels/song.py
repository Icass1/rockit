from typing import List, TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.db.associationTables.song_artists import song_artists
from backend.db.associationTables.playlist_songs import playlist_songs
from backend.db.associationTables.user_liked_songs import user_liked_songs
from backend.db.associationTables.user_queue_songs import user_queue_songs
from backend.db.associationTables.user_history_songs import user_history_songs

if TYPE_CHECKING:
    from backend.db.ormModels.user import UserRow
    from backend.db.ormModels.album import AlbumRow
    from backend.db.ormModels.artist import ArtistRow
    from backend.db.ormModels.playlist import PlaylistRow
    from backend.db.ormModels.internalImage import InternalImageRow


class SongRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "songs"
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False)
    popularity: Mapped[int] = mapped_column(Integer)
    internal_image_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)
    path: Mapped[str] = mapped_column(String)
    album_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'main.albums.id'), nullable=False)
    isrc: Mapped[str] = mapped_column(String, nullable=False, unique=False)
    download_url: Mapped[str] = mapped_column(String)
    lyrics: Mapped[str] = mapped_column(Text)
    dynamic_lyrics: Mapped[str] = mapped_column(Text)

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow", secondary=song_artists, back_populates="songs")

    playlists: Mapped[List["PlaylistRow"]] = relationship(
        "PlaylistRow", secondary=playlist_songs, back_populates="songs"
    )

    internal_image: Mapped["InternalImageRow"] = relationship(
        'InternalImageRow', back_populates='songs', foreign_keys=[internal_image_id])
    album: Mapped["AlbumRow"] = relationship(
        "AlbumRow", back_populates="songs")

    # back_populates for users
    history_users: Mapped[List["UserRow"]] = relationship(
        "UserRow", secondary=user_history_songs, back_populates="history_songs")
    liked_by_users: Mapped[List["UserRow"]] = relationship(
        "UserRow", secondary=user_liked_songs, back_populates="liked_songs")
    queued_by_users: Mapped[List["UserRow"]] = relationship(
        "UserRow", secondary=user_queue_songs, back_populates="queue_songs")
