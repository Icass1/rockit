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
    from backend.db.ormModels.downloadStatus import DownloadStatusRow


class SongRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "songs"
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False)
    popularity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    internal_image_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=False)
    path: Mapped[str | None] = mapped_column(String, nullable=True)
    album_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'main.albums.id'), nullable=False)
    isrc: Mapped[str] = mapped_column(String, nullable=False, unique=False)
    download_url: Mapped[str | None] = mapped_column(String, nullable=True)
    lyrics: Mapped[str | None] = mapped_column(Text, nullable=True)
    dynamic_lyrics: Mapped[str | None] = mapped_column(Text, nullable=True)
    preview_url: Mapped[str | None] = mapped_column(String, nullable=True)

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow", secondary=song_artists, back_populates="songs")

    playlists: Mapped[List["PlaylistRow"]] = relationship(
        "PlaylistRow", secondary=playlist_songs, back_populates="songs"
    )

    internal_image: Mapped["InternalImageRow | None"] = relationship(
        'InternalImageRow', back_populates='songs', foreign_keys=[internal_image_id])
    album: Mapped["AlbumRow"] = relationship(
        "AlbumRow", back_populates="songs")
    downloads: Mapped[List["DownloadStatusRow"]] = relationship(
        "DownloadStatusRow", back_populates="song")

    # back_populates for users
    history_users: Mapped[List["UserRow"]] = relationship(
        "UserRow", secondary=user_history_songs, back_populates="history_songs")
    liked_by_users: Mapped[List["UserRow"]] = relationship(
        "UserRow", secondary=user_liked_songs, back_populates="liked_songs")
    queued_by_users: Mapped[List["UserRow"]] = relationship(
        "UserRow", secondary=user_queue_songs, back_populates="queue_songs")

    def __init__(self, public_id: str, name: str, duration: int, track_number: int, disc_number: int, internal_image_id: int, album_id: int, isrc: str, popularity: int | None = None, path: str | None = None, download_url: str | None = None, lyrics: str | None = None, dynamic_lyrics: str | None = None, preview_url: str | None = None):
        kwargs = {}
        kwargs['public_id'] = public_id
        kwargs['name'] = name
        kwargs['duration'] = duration
        kwargs['track_number'] = track_number
        kwargs['disc_number'] = disc_number
        kwargs['internal_image_id'] = internal_image_id
        kwargs['album_id'] = album_id
        kwargs['isrc'] = isrc
        kwargs['popularity'] = popularity
        kwargs['path'] = path
        kwargs['download_url'] = download_url
        kwargs['lyrics'] = lyrics
        kwargs['dynamic_lyrics'] = dynamic_lyrics
        kwargs['preview_url'] = preview_url
        for k, v in kwargs.items():
            setattr(self, k, v)
