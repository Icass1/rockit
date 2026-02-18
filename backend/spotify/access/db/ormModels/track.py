from typing import List, TYPE_CHECKING, Dict

from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship, mapped_column, Mapped

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId
from backend.spotify.access.db.associationTables.song_artists import song_artists

if TYPE_CHECKING:
    from backend.spotify.access.db.ormModels.album import AlbumRow
    from backend.spotify.access.db.ormModels.artist import ArtistRow
    from backend.spotify.access.db.ormModels.internalImage import InternalImageRow
    from backend.spotify.access.db.ormModels.downloadStatus import DownloadStatusRow

    from backend.spotify.access.db.associationTables.playlist_tracks import PlaylistTrackLink


class TrackRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "tracks"
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},

    public_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    track_number: Mapped[int] = mapped_column(Integer, nullable=False)
    disc_number: Mapped[int] = mapped_column(Integer, nullable=False)
    popularity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    internal_image_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'spotify.internal_images.id'), nullable=False)
    path: Mapped[str | None] = mapped_column(String, nullable=True)
    album_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'spotify.albums.id'), nullable=False)
    isrc: Mapped[str] = mapped_column(String, nullable=False, unique=False)
    download_url: Mapped[str | None] = mapped_column(String, nullable=True)
    lyrics: Mapped[str | None] = mapped_column(Text, nullable=True)
    dynamic_lyrics: Mapped[str | None] = mapped_column(Text, nullable=True)
    preview_url: Mapped[str | None] = mapped_column(String, nullable=True)

    artists: Mapped[List["ArtistRow"]] = relationship(
        "ArtistRow", secondary=song_artists, back_populates="songs")

    internal_image: Mapped["InternalImageRow | None"] = relationship(
        'InternalImageRow', back_populates='songs', foreign_keys=[internal_image_id])
    album: Mapped["AlbumRow"] = relationship(
        "AlbumRow", back_populates="songs")
    downloads: Mapped[List["DownloadStatusRow"]] = relationship(
        "DownloadStatusRow", back_populates="song")

    playlist_song_links: Mapped[List["PlaylistTrackLink"]] = relationship(
        "PlaylistTrackLink",
        back_populates="track"
    )

    def __init__(self, public_id: str, name: str, duration: int, track_number: int, disc_number: int, internal_image_id: int, album_id: int, isrc: str, popularity: int | None = None, path: str | None = None, download_url: str | None = None, lyrics: str | None = None, dynamic_lyrics: str | None = None, preview_url: str | None = None):
        kwargs: Dict[str, None | int | str] = {}
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
