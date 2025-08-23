from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column

from backend.db.base import Base

from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

from backend.db.associationTables.song_artists import song_artists
from backend.db.associationTables.playlist_songs import playlist_songs
from backend.db.associationTables.user_history_songs import user_history_songs
from backend.db.associationTables.user_liked_songs import user_liked_songs
from backend.db.associationTables.user_queue_songs import user_queue_songs


class SongRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "songs"
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = mapped_column(String, nullable=False, unique=True)
    name = mapped_column(String, nullable=False)
    duration = mapped_column(Integer, nullable=False)
    track_number = mapped_column(Integer, nullable=False)
    disc_number = mapped_column(Integer, nullable=False)
    popularity = mapped_column(Integer)
    internal_image_id = mapped_column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)
    path = mapped_column(String)
    album_id = mapped_column(Integer, ForeignKey(
        'main.albums.id'), nullable=False)
    isrc = mapped_column(String, nullable=False, unique=False)
    download_url = mapped_column(String)
    lyrics = mapped_column(Text)
    dynamic_lyrics = mapped_column(Text)

    internal_image = relationship(
        'InternalImageRow', back_populates='songs', foreign_keys=[internal_image_id])

    album = relationship("AlbumRow", back_populates="songs")

    artists = relationship(
        "ArtistRow", secondary=song_artists, back_populates="songs")

    playlists = relationship(
        "PlaylistRow",
        secondary=playlist_songs,
        back_populates="songs"
    )



    internal_image = relationship('InternalImageRow', back_populates='songs', foreign_keys=[internal_image_id])
    album = relationship("AlbumRow", back_populates="songs")

    # many-to-many
    artists = relationship("ArtistRow", secondary=song_artists, back_populates="songs")
    playlists = relationship("PlaylistRow", secondary=playlist_songs, back_populates="songs")

    # back_populates for users
    history_users = relationship("UserRow", secondary=user_history_songs, back_populates="history_songs")
    liked_by_users = relationship("UserRow", secondary=user_liked_songs, back_populates="liked_songs")
    queued_by_users = relationship("UserRow", secondary=user_queue_songs, back_populates="queue_songs")