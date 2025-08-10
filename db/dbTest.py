

from typing import Any, List, Literal
from sqlalchemy import Table, create_engine, Column, String, ForeignKey, select
from sqlalchemy.orm import declarative_base, relationship, Session, joinedload, Mapped, mapped_column

Base = declarative_base()
Base.metadata.schema = "main"

# Association tables
song_artists = Table(
    'song_artists', Base.metadata,
    Column('song_id', ForeignKey('songs.id'), primary_key=True),
    Column('artist_id', ForeignKey('artists.id'), primary_key=True)
)

album_artists = Table(
    'album_artists', Base.metadata,
    Column('album_id', ForeignKey('albums.id'), primary_key=True),
    Column('artist_id', ForeignKey('artists.id'), primary_key=True)
)

# Define ORM models


class Album(Base):
    __tablename__ = 'albums'
    id = mapped_column(String, primary_key=True)
    name = mapped_column(String)

    songs = relationship("Song", back_populates="album")
    artists = relationship(
        "Artist", secondary=album_artists, back_populates="albums")

    # songs: _RelationshipDeclared[List["Song"]] = relationship("Song", back_populates="album")
    # artists: _RelationshipDeclared[List["Artist"]] = relationship(
    #     "Artist", secondary=album_artists, back_populates="albums")


class Song(Base):
    __tablename__ = "songs"
    id = Column(String, primary_key=True)
    name = Column(String)
    album_id = Column(String, ForeignKey('albums.id'))

    album = relationship("Album", back_populates="songs")
    artists = relationship(
        "Artist", secondary=song_artists, back_populates="songs")


class Artist(Base):
    __tablename__ = 'artists'
    id = Column(String, primary_key=True)
    name = Column(String)

    songs = relationship("Song", secondary=song_artists,
                         back_populates="artists")
    albums = relationship("Album", secondary=album_artists,
                          back_populates="artists")


# In-memory SQLite DB
engine = create_engine("postgresql://admin:admin@12.12.12.3:5432/development?sslmode=disable")
Base.metadata.create_all(engine)

session = Session(engine)

with Session(engine) as session:
    artist1 = Artist(id="artistid1", name="Artist One")
    artist2 = Artist(id="artistid2", name="Artist Two")

    album = Album(id="albumid1", name="Best Album", artists=[artist1])
    song1 = Song(id="songid1", name="Hit Song",
                 album=album, artists=[artist1, artist2])
    song2 = Song(id="songid2", name="Chill Song",
                 album=album, artists=[artist1])

    session.add_all([album, song1, song2])
    session.commit()


# album_id = "albumid1"

# album: Album | None = session.execute(
#     select(Album)
#     .options(
#         joinedload(Album.artists),              # Load album → artists
#         joinedload(Album.songs)
#         .joinedload(Song.artists)           # Load songs → artists
#     )
#     .where(Album.id == album_id)
# ).unique().scalar_one_or_none()


# if album:
#     print(album.name)
#     album.name = "test album name"
#     print(type(album.name))
#     artists: List[Artist] = album.artists
#     session.commit()

#     print("album.songs", artists[0].songs)
# else:
#     print("Album not found")
