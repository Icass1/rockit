import sqlite3
from sqlalchemy import create_engine
from backend.backendUtils import create_id
from backend.db.db import Album, Base
from sqlalchemy.orm import Session
import json

from datetime import datetime


from typing import Any, List, Literal
from sqlalchemy import Table, create_engine, Column, String, ForeignKey, select, Text, Integer, Date
from sqlalchemy.orm import declarative_base, relationship, Session, joinedload, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import insert

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

album_external_images = Table(
    'album_external_images',
    Base.metadata,
    Column('album_id', ForeignKey('main.albums.id'), primary_key=True),
    Column('external_image_id', ForeignKey(
        'main.external_images.id'), primary_key=True),
    schema='main'
)

song_external_images = Table(
    'song_external_images',
    Base.metadata,
    Column('song_id', ForeignKey('main.songs.id'), primary_key=True),
    Column('external_image_id', ForeignKey(
        'main.external_images.id'), primary_key=True),
    schema='main'
)

# Define ORM models


class InternalImage(Base):
    __tablename__ = 'internal_images'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    id = mapped_column(String, nullable=False, primary_key=True)
    url = mapped_column(String, nullable=False)
    path = mapped_column(String, nullable=False)

    songs = relationship("Song", back_populates="internal_image")
    albums = relationship("Album", back_populates="internal_image")


class ExternalImage(Base):
    __tablename__ = 'external_images'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    id = mapped_column(String, nullable=False, primary_key=True)
    url = mapped_column(String, nullable=False)
    width = mapped_column(Integer, nullable=False)
    height = mapped_column(Integer, nullable=False)

    albums = relationship(
        "Album",
        secondary=album_external_images,
        back_populates="external_images"
    )


class Album(Base):
    __tablename__ = "albums"

    id = Column(String, primary_key=True)
    internal_image_id = Column(String, ForeignKey(
        "main.internal_images.id"), nullable=False)
    name = Column(String, nullable=False)
    release_date = Column(String, nullable=False)
    popularity = Column(Integer)
    disc_count = Column(Integer, nullable=False)
    date_added = Column(Date, nullable=False)

    # ORM relationship
    internal_image = relationship("InternalImage", back_populates="albums")
    songs = relationship("Song", back_populates="album")
    artists = relationship(
        "Artist", secondary=album_artists, back_populates="albums")

    external_images = relationship(
        "ExternalImage",
        secondary=album_external_images,
        back_populates="albums"
    )


class Song(Base):
    __tablename__ = "songs"
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)
    track_number = Column(Integer, nullable=False)
    disc_number = Column(Integer, nullable=False)
    popularity = Column(Integer)
    internal_image_id = Column(String, ForeignKey(
        'main.internal_images.id'), nullable=True)
    path = Column(String)
    album_id = Column(String, ForeignKey('main.albums.id'), nullable=False)
    date_added = Column(Date, nullable=False)
    isrc = Column(String, nullable=False, unique=True)
    download_url = Column(String)
    lyrics = Column(Text)
    dynamic_lyrics = Column(Text)

    # Optional relationships if you want to navigate from song → album/image
    internal_image = relationship(
        'InternalImage', back_populates='songs', foreign_keys=[internal_image_id])
    album = relationship("Album", back_populates="songs")
    artists = relationship(
        "Artist", secondary=song_artists, back_populates="songs")


class Artist(Base):
    __tablename__ = 'artists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    id = Column(String, primary_key=True)
    name = Column(String)

    songs = relationship("Song", secondary=song_artists,
                         back_populates="artists")
    albums = relationship("Album", secondary=album_artists,
                          back_populates="artists")


engine = create_engine(
    "postgresql://admin:admin@12.12.12.3:5432/development?sslmode=disable", echo=False)
Base.metadata.create_all(engine)

session = Session(engine)

conn = sqlite3.connect(
    'file:database/database-prod.db?mode=ro', check_same_thread=False)
cursor = conn.cursor()


external_images_in_db = session.query(ExternalImage).all()
external_images_in_db_url = {image.url for image in external_images_in_db}


cursor.execute("SELECT * FROM image")
images = cursor.fetchall()
for image in images:

    id = image[0]
    path = image[1]
    url = image[2]

    print(f"Adding internal_image: {id=} {path=} {url=}")

    image_to_add = InternalImage(
        id=id,
        url=url,
        path=path)

    session.merge(image_to_add)

cursor.execute("SELECT * FROM album")
albums = cursor.fetchall()

for album in albums:
    id = album[0]
    type = album[1]
    external_images = json.loads(album[2])
    internal_image_id = album[3]
    name = album[4]
    release_date = album[5]
    artists = json.loads(album[6])
    copyrights = json.loads(album[7])
    popularity = album[8]
    genres = album[9]
    songs = json.loads(album[10])
    disc_count = album[11]
    date_added = album[12]

    print(f"Adding album: {name} with id: {id}")

    albums_to_add = Album(
        id=id, name=name, internal_image_id=internal_image_id, release_date=release_date, disc_count=disc_count, date_added=datetime.now(), popularity=popularity)

    session.merge(albums_to_add)

    for k in external_images:
        url = k['url']
        width = k['width']
        height = k['height']

        external_image_id: str | None = None

        if url in external_images_in_db_url:
            print(f"External image already exists in DB: {url}")
            for k in external_images_in_db:
                if k.url == url:
                    external_image_id = k.id
                    break
        else:
            external_image_id = create_id()
            external_image_to_add = ExternalImage(
                id=external_image_id, url=url, width=width, height=height)

            print(f"Adding external image to album: {name}")

            session.merge(external_image_to_add)

        stmt = insert(album_external_images).values(
            album_id=id,
            external_image_id=external_image_id
        ).on_conflict_do_nothing()
        print(
            f"Adding external image to album_external_images: {id=} {external_image_id=}")
        session.execute(stmt)


cursor.execute("SELECT * FROM song")
songs = cursor.fetchall()

for song in songs:
    id = song[0]
    name = song[1]
    artists = json.loads(song[2])
    genres: List[str] = json.loads(song[3])
    disc_number = song[4]
    album_name = song[5]
    album_artist = json.loads(song[6])
    album_type = song[7]
    album_id = song[8]
    isrc = song[9]
    duration = song[10]
    date = song[11]
    track_number = song[12]
    publisher = song[13]
    path = song[14]
    external_images = json.loads(song[15])
    internal_image_id = song[16]
    copyright = song[17]
    download_url = song[18]
    lyrics = song[19]
    dynamic_lyrics = song[20]
    popularity = song[21]
    date_added = song[22]

    print(f"Adding song: {name} - {album_name}")

    song_to_add = Song(
        id=id,
        name=name,
        duration=duration,
        track_number=track_number,
        disc_number=disc_number,
        popularity=popularity,
        internal_image_id=internal_image_id,
        path=path,
        album_id=album_id,
        date_added=date_added,
        isrc=isrc,
        download_url=download_url,
        lyrics=lyrics,
        dynamic_lyrics=dynamic_lyrics
    )

    session.merge(song_to_add)



cursor.execute("SELECT * FROM playlist")
songs = cursor.fetchall()


session.commit()
