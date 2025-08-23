
import os  # noqa
import sys  # noqa


sys.path.append(os.getcwd())  # noqa
sys.path.append(os.getcwd() + "/backend")  # noqa


from flask.cli import F
from sqlalchemy import Boolean, Double, Table, create_engine, Column, String, ForeignKey, Text, Integer, func, DateTime, Enum
from sqlalchemy.orm import declarative_base, relationship, Session, mapped_column, declarative_mixin
from sqlalchemy.dialects.postgresql.dml import Insert
from sqlalchemy.dialects.postgresql import insert

from typing import List, Dict, Any, Tuple
from datetime import datetime
from dateutil import parser
import requests
import hashlib
import sqlite3
import base64
import dotenv
import math
import json

from backend.backendUtils import create_id, download_image, get_utc_date, sanitize_folder_name
from backend.constants import IMAGES_PATH
from backend.logger import getLogger

logger = getLogger(__name__)

dotenv.load_dotenv()


client_id = os.getenv('CLIENT_ID')
client_secret = os.getenv('CLIENT_SECRET')

token: str | None = None


def get_token():
    global token
    global client_id
    global client_secret

    if not client_id:
        logger.critical("client_id not set")
        return

    if not client_secret:
        logger.critical("client_secret not set")
        return

    auth_string = client_id + ':' + client_secret
    auth_bytes = auth_string.encode('utf-8')
    auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

    url = "https://accounts.spotify.com/api/token"
    headers = {
        "Authorization": "Basic " + auth_base64,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {"grant_type": "client_credentials"}

    result = requests.post(url, headers=headers, data=data)
    json_response = json.loads(result.content)

    token = json_response["access_token"]
    logger.info("New token")


def get_auth_header():
    global token
    global client_id
    global client_secret

    if not token:
        logger.critical("token not set")
        return

    return {"Authorization": "Bearer " + token}


def api_call(path: str, params: Dict[str, str] = {}) -> Any | None:
    global token, client_id, client_secret

    # Ensure temp directory exists
    os.makedirs("temp", exist_ok=True)

    # Build a deterministic string for request
    params_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    cache_key_str = f"{path}?{params_str}"
    cache_hash = hashlib.sha256(cache_key_str.encode()).hexdigest()
    cache_file = os.path.join("temp", f"{cache_hash}.json")

    # Check cache first
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                logger.info(f"{cache_key_str}")
                logger.info(f"Cache hit: {cache_file}")
                return json.load(f)
        except Exception as e:
            logger.warning(f"Cache read failed ({cache_file}): {e}")

    # Build the API request
    parsed_params = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"https://api.spotify.com/v1/{path}"
    headers = get_auth_header()
    query_url = url + ("?" + parsed_params if parsed_params else "")

    logger.warning(f"Spotify api call: {query_url}")

    result = requests.get(query_url, headers=headers)
    if result.status_code == 401:
        logger.info("Token expired")
        get_token()
        headers = get_auth_header()
        result = requests.get(query_url, headers=headers)

    try:
        data = result.json()
        print(data)
        # Save to cache
        try:
            logger.info(f"Saving cache file: {cache_file}")
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f)
        except Exception as e:
            logger.warning(f"Failed to write cache file {cache_file}: {e}")
        return data
    except Exception:
        logger.critical(
            f"Unable to load json. {result.content=}, {result.text=} {result.status_code=}"
        )
        return None


get_token()


# def logger.error(message: str):
#     with open("db/log.txt", "a") as f:
#         f.write(f"{message}\n")


def parse_any_datetime(s: str) -> datetime:
    return parser.parse(s)


Base = declarative_base()
Base.metadata.schema = "main"


@declarative_mixin
class TableDateUpdated:
    date_updated = Column(
        DateTime(timezone=False),
        nullable=False,
        default=func.now(),
        onupdate=func.now()
    )


@declarative_mixin
class TableDateAdded:
    date_added = Column(
        DateTime(timezone=False),
        nullable=False,
        default=func.now(),
    )


@declarative_mixin
class TableAutoincrementId:
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )


def date_added_column():
    return Column("date_added", DateTime(timezone=False), nullable=False, default=func.now())


def date_updated_column():
    return Column("date_updated", DateTime(timezone=False), nullable=False, default=func.now(), onupdate=func.now())


# Association tables
lists = Table(
    'lists', Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('type', Enum("album", "playlist",
           name="type_enum", schema="main"), nullable=False),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

song_artists = Table(
    'song_artists', Base.metadata,
    Column('song_id', ForeignKey('songs.id'), primary_key=True),
    Column('artist_id', ForeignKey('artists.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

album_artists = Table(
    'album_artists', Base.metadata,
    Column('album_id', ForeignKey('albums.id'), primary_key=True),
    Column('artist_id', ForeignKey('artists.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

album_external_images = Table(
    'album_external_images',
    Base.metadata,
    Column('album_id', ForeignKey('main.albums.id'), primary_key=True),
    Column('external_image_id', ForeignKey(
        'main.external_images.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

playlist_external_images = Table(
    'playlist_external_images',
    Base.metadata,
    Column('playlist_id', ForeignKey('main.playlists.id'), primary_key=True),
    Column('external_image_id', ForeignKey(
        'main.external_images.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

artist_external_images = Table(
    'artist_external_images',
    Base.metadata,
    Column('artist_id', ForeignKey('main.artists.id'), primary_key=True),
    Column('external_image_id', ForeignKey(
        'main.external_images.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

playlist_songs = Table(
    'playlist_songs',
    Base.metadata,
    Column('playlist_id', ForeignKey('main.playlists.id'), primary_key=True),
    Column('song_id', ForeignKey('main.songs.id'), primary_key=True),
    Column("added_by", String, nullable=True),
    Column("disabled", Boolean(), nullable=False),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

artist_genres = Table(
    'artist_genres', Base.metadata,
    Column('artist_id', ForeignKey('artists.id'), primary_key=True),
    Column('genre_id', ForeignKey(column='genres.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

user_lists = Table(
    'user_lists', Base.metadata,
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('list_id', ForeignKey('lists.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

user_queue_songs = Table(
    'user_queue_songs', Base.metadata,
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('song_id', ForeignKey('songs.id'), primary_key=True),
    Column('position', Integer, nullable=False),
    Column('list_type', Enum("album", "playlist", "carousel"
           "recently-played", name="list_type_enum", schema="main"), nullable=False),
    Column('list_id', ForeignKey('lists.id'), nullable=True),
)

user_pinned_lists = Table(
    'user_pinned_lists', Base.metadata,
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('list_id', ForeignKey('lists.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

user_liked_songs = Table(
    'user_liked_songs', Base.metadata,
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('song_id', ForeignKey('songs.id'), primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)

user_history_songs = Table(
    'user_history_songs', Base.metadata,
    Column('user_id', ForeignKey('users.id'), primary_key=True),
    Column('song_id', ForeignKey('songs.id'), primary_key=True),
    Column('played_at', DateTime(timezone=False),
           nullable=False, primary_key=True),
    date_added_column(),
    date_updated_column(),
    schema='main'
)


class Genre(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'genres'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = Column(String, nullable=False)
    name = Column(String, nullable=False, unique=True)

    artists = relationship(
        "Artist", secondary=artist_genres, back_populates="genres")


# Define ORM models
class InternalImage(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'internal_images'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = mapped_column(String, nullable=False)
    url = mapped_column(String, nullable=False)
    path = mapped_column(String, nullable=False)

    songs = relationship("Song", back_populates="internal_image")
    albums = relationship("Album", back_populates="internal_image")
    playlists = relationship("Playlist", back_populates="internal_image")
    artists = relationship("Artist", back_populates="internal_image")


class ExternalImage(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'external_images'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = Column(String, nullable=False)
    url = Column(String, nullable=False, unique=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    albums = relationship(
        "Album",
        secondary=album_external_images,
        back_populates="external_images"
    )
    playlists = relationship(
        "Playlist",
        secondary=playlist_external_images,
        back_populates="external_images"
    )
    artists = relationship(
        "Artist",
        secondary=artist_external_images,
        back_populates="external_images"
    )


class Album(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = "albums"

    id = Column(Integer, ForeignKey('lists.id'), primary_key=True)
    public_id = Column(String, nullable=False)
    internal_image_id = Column(Integer, ForeignKey(
        "main.internal_images.id"), nullable=False)
    name = Column(String, nullable=False)
    release_date = Column(String, nullable=False)
    popularity = Column(Integer)
    disc_count = Column(Integer, nullable=False)

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


class Song(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "songs"
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)
    track_number = Column(Integer, nullable=False)
    disc_number = Column(Integer, nullable=False)
    popularity = Column(Integer)
    internal_image_id = Column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)
    path = Column(String)
    album_id = Column(Integer, ForeignKey('main.albums.id'), nullable=False)
    isrc = Column(String, nullable=False, unique=False)
    download_url = Column(String)
    lyrics = Column(Text)
    dynamic_lyrics = Column(Text)

    internal_image = relationship(
        'InternalImage', back_populates='songs', foreign_keys=[internal_image_id])
    album = relationship("Album", back_populates="songs")
    artists = relationship(
        "Artist", secondary=song_artists, back_populates="songs")

    playlists = relationship(
        "Playlist",
        secondary=playlist_songs,
        back_populates="songs"
    )


class Artist(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'artists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = Column(String, nullable=False)
    name = Column(String)
    followers = Column(Integer, nullable=False, default=0)
    popularity = Column(Integer, nullable=False, default=0)
    internal_image_id = Column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)

    songs = relationship("Song", secondary=song_artists,
                         back_populates="artists")
    albums = relationship("Album", secondary=album_artists,
                          back_populates="artists")
    internal_image = relationship(
        'InternalImage', back_populates='artists', foreign_keys=[internal_image_id])

    genres = relationship(
        "Genre",
        secondary=artist_genres,
        back_populates="artists"
    )

    external_images = relationship(
        "ExternalImage",
        secondary=artist_external_images,
        back_populates="artists"
    )


class Playlist(Base, TableDateUpdated, TableDateAdded):
    __tablename__ = 'playlists'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    id = Column(Integer, ForeignKey('lists.id'), primary_key=True)
    public_id = Column(String, nullable=False)
    internal_image_id = Column(Integer, ForeignKey(
        'main.internal_images.id'), nullable=True)
    name = Column(String, nullable=False)
    owner = Column(String, nullable=False)
    followers = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=True)

    internal_image = relationship(
        'InternalImage', back_populates='playlists', foreign_keys=[internal_image_id])

    external_images = relationship(
        "ExternalImage",
        secondary=playlist_external_images,
        back_populates="playlists"
    )
    songs = relationship(
        "Song",
        secondary=playlist_songs,
        back_populates="playlists"
    )


class User(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    public_id = Column(String, nullable=False)
    username = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    current_station = Column(String, nullable=True)
    current_time = Column(Integer, nullable=True)
    queue_index = Column(Integer, nullable=True)
    random_queue = Column(Boolean, nullable=False, default=False)
    repeat_song = Column(Enum(
        "off", "one", "all", name="repeat_song_enum", schema="main"), nullable=False, default="off")
    volume = Column(Double, nullable=False, default=1)
    cross_fade = Column(Double, nullable=False, default=0)
    lang = Column(String, nullable=False, default="en")
    admin = Column(Boolean, nullable=False, default=False)
    super_admin = Column(Boolean, nullable=False, default=False)


class Downloads(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'downloads'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    user_id = Column(Integer, ForeignKey('main.users.id'), nullable=False)
    date_started = Column(DateTime(timezone=False), nullable=False)
    date_ended = Column(DateTime(timezone=False), nullable=True)
    download_url = Column(String, nullable=False)
    status = Column(Enum("pending", "in_progress", "completed",
                         "failed", name="download_status_enum", schema="main"), nullable=False, default="pending")
    seen = Column(Boolean, nullable=False, default=False)
    success = Column(Integer, nullable=True)
    fail = Column(Integer, nullable=True)


class Errors(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'errors'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    user_id = Column(Integer, ForeignKey('main.users.id'), nullable=True)
    message = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    line_no = Column(Integer, nullable=True)
    column_no = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    error_cause = Column(Text, nullable=True)
    error_name = Column(String, nullable=True)
    error_stack = Column(Text, nullable=True)


engine = create_engine(
    "postgresql://admin:admin@12.12.12.3:5432/development?sslmode=disable", echo=False)
Base.metadata.create_all(engine)

session = Session(engine)

conn = sqlite3.connect(
    'file:database/database-prod.db?mode=ro', check_same_thread=False)
cursor = conn.cursor()


exit()

external_images_in_db: List[Tuple[str, str]] = [(str(external_image.id), str(external_image.url))
                                                for external_image in session.query(ExternalImage).all()]

cursor.execute("PRAGMA table_info(playlist);")
print(",".join([column[1] for column in cursor.fetchall()]))

artists_to_add = []


song_artists_list: List[Tuple[str, str]] = []
album_artists_list: List[Tuple[str, str]] = []


def add_internal_images():
    cursor.execute("SELECT id,path,url FROM image")
    images = cursor.fetchall()
    paths = []
    for image in images:

        id = image[0]
        path = image[1]
        url = image[2]

        if path in paths:
            logger.error(f"Path already exists: {path} {id}")
            continue

        paths.append(path)

        # logger.info(f"Adding internal_image: {id=} {path=} {url=}")

        image_to_add = InternalImage(
            id=id,
            url=url,
            path=path)

        session.merge(image_to_add)

    session.commit()
    logger.info("Added all internal images.")


def add_albums():

    cursor.execute(
        "SELECT id,type,images,image,name,releaseDate,artists,copyrights,popularity,genres,songs,discCount,dateAdded FROM album")
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

        artists_to_add.extend(artists)

        album_artists_list.extend([(id, artist["id"]) for artist in artists])

        if internal_image_id == "":
            logger.error(
                f"Skipping album {id} with empty internal_image_id")
            continue

        # logger.info(f"Adding album: {name} with id: {id}")

        albums_to_add = Album(
            id=id, name=name, internal_image_id=internal_image_id, release_date=release_date, disc_count=disc_count, popularity=popularity)

        session.merge(albums_to_add)

        for k in external_images:
            url = k['url']
            width = k['width']
            height = k['height']

            external_image_id: str | None = None

            if url in [url for _, url in external_images_in_db]:
                # logger.info(f"External image already exists in DB: {url}")
                for k in external_images_in_db:
                    if k[1] == url:
                        external_image_id = str(k[0])
                        break
            else:
                external_image_id = create_id()
                external_image_to_add = ExternalImage(
                    id=external_image_id, url=url, width=width, height=height)

                external_images_in_db.append((external_image_id, url))

                session.merge(external_image_to_add)
                session.flush()

            stmt = insert(album_external_images).values(
                album_id=id,
                external_image_id=external_image_id
            ).on_conflict_do_nothing()
            session.execute(stmt)

    session.commit()

    logger.info("Added all albums and their external images.")


def download_albums_data(ids: List[str]):
    for k in range(math.ceil(len(ids)/20)):
        response = api_call(
            path=f"albums", params={"ids": ",".join(ids[k*20:(k + 1)*20])})

        if not response:
            logger.error("Response is None")
            continue

        for album in response["albums"]:

            if len(album["images"]) > 1:
                image_url = max(album["images"], key=lambda i: i["width"] *
                                i["height"] if i["width"] and i["height"] else 0)["url"] if album["images"] else None
            else:
                image_url = album["images"][0]["url"]

            image_path_dir = os.path.join("album", sanitize_folder_name(
                album["artists"][0]["name"]), sanitize_folder_name(album["name"]))
            image_path = os.path.join(image_path_dir, "image.png")

            if not os.path.exists(os.path.join(IMAGES_PATH, image_path_dir)):
                os.makedirs(os.path.join(
                    IMAGES_PATH, image_path_dir))

            if not os.path.exists(os.path.join(IMAGES_PATH, image_path)) and type(image_url) == str:
                logger.info(
                    f"Downloading image {image_url=} {image_path=}")
                download_image(url=image_url, path=os.path.join(
                    IMAGES_PATH, image_path))

            image = session.query(InternalImage).filter(
                InternalImage.path == image_path).first()

            album_artists_list.extend(
                [(album["id"], artist["id"]) for artist in album["artists"]])

            if image:
                # logger.info("Image in database")
                image_id = image.id
            else:
                # logger.info("Image not in database")
                logger.info(image_path)

                image_id = create_id(20)

            image_to_add = InternalImage(
                id=image_id,
                url=image_url,
                path=image_path
            )

            session.merge(image_to_add)

            artists_to_add.extend(album["artists"])

            album_to_add = Album(
                id=album["id"],
                name=album["name"],
                internal_image_id=image_id,
                release_date=album["release_date"],
                disc_count=len(album.get("disc_number", [])),
                popularity=album.get("popularity", 0)
            )

            session.merge(album_to_add)

            for album_image in album["images"]:
                url = album_image['url']
                width = album_image['width']
                height = album_image['height']

                external_image_id: str | None = None

                if url in [url for _, url in external_images_in_db]:
                    # logger.info(f"External image already exists in DB: {url}")ko
                    for k in external_images_in_db:
                        if k[1] == url:
                            external_image_id = k[0]
                            break
                else:
                    external_image_id = create_id()
                    external_image_to_add = ExternalImage(
                        id=external_image_id, url=url, width=width, height=height)

                    external_images_in_db.append((external_image_id, url))

                    session.merge(external_image_to_add)
                    session.flush()

                stmt = insert(album_external_images).values(
                    album_id=album["id"],
                    external_image_id=external_image_id
                ).on_conflict_do_nothing()
                session.execute(stmt)

        session.commit()


def add_songs():

    cursor.execute("SELECT id,name,artists,genres,discNumber,albumName,albumArtist,albumType,albumId,isrc,duration,date,trackNumber,publisher,path,images,image,copyright,downloadUrl,lyrics,dynamicLyrics,popularity,dateAdded FROM song")
    songs = cursor.fetchall()

    songs_in_db = session.query(Song).all()
    songs_in_db_id = {song.id for song in songs_in_db}

    songs_without_isrc = [song[0]
                          for song in songs if (song[9] == "" or song[9] is None) and song[0] not in songs_in_db_id]

    missing_albums = set()
    albums_in_db = [a.id for a in session.query(Album).all()]
    for song in songs:
        album_id = song[8]
        if album_id is None or album_id == "":
            logger.error(
                f"Skipping song {song[0]} with empty album_id")
            continue

        if album_id not in missing_albums and album_id not in albums_in_db:
            missing_albums.add(album_id)

    missing_albums = list(missing_albums)
    missing_albums.sort()

    logger.info(f"Missing albums: {len(missing_albums)}")

    download_albums_data(missing_albums)

    logger.info("Songs without ISRC:", len(songs_without_isrc))

    songs_isrc: Dict[str, str] = {}

    for k in range(math.ceil(len(songs_without_isrc)/100)):
        response = api_call(
            path=f"tracks", params={"ids": ",".join(songs_without_isrc[k*100:(k + 1)*100])})

        if not response:
            logger.error("Response is None")
            continue

        for track in response["tracks"]:
            songs_isrc[track["id"]] = track["external_ids"]["isrc"]

    with open("db/songs_isrc.json", "w") as f:
        json.dump(songs_isrc, f, indent=4)

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

        artists_to_add.extend(artists)
        song_artists_list.extend([(id, artist["id"]) for artist in artists])

        if isrc == "" or isrc is None:
            if id in songs_isrc:
                isrc = songs_isrc[id]
            else:
                logger.error(f"Skipping song {id} with empty ISRC")
                continue

        # if id == "2h6HdN3oPr4JijIQV29hv1":
        #     logger.info("Skipping song with id 2h6HdN3oPr4JijIQV29hv1 beacause is repeated in production database")
        #     continue

        # logger.info(f"Adding song: {name} - {album_name}")

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
            isrc=isrc,
            download_url=download_url,
            lyrics=lyrics,
            dynamic_lyrics=dynamic_lyrics
        )

        session.merge(song_to_add)

    session.commit()
    logger.info("Added all songs.")


def add_playlists():

    songs_in_db = session.query(Song).all()
    songs_in_db_id = {song.id for song in songs_in_db}

    cursor.execute(
        "SELECT id,images,name,description,owner,followers,songs,image,updatedAt,createdAt FROM playlist")
    playlists = cursor.fetchall()

    for playlist in playlists:
        id = playlist[0]
        external_images = json.loads(playlist[1])
        name = playlist[2]
        description = playlist[3]
        owner = playlist[4]
        followers = playlist[5]
        songs = json.loads(playlist[6])
        internal_image_id = playlist[7]
        updated_at = playlist[8]
        created_at = playlist[9]

        # logger.info(f"Adding playlist: {name} with id: {id}")

        playlist_to_add = Playlist(
            id=id,
            name=name,
            description=description,
            owner=owner,
            internal_image_id=internal_image_id,
            followers=followers,
        )
        session.merge(playlist_to_add)

        for k in external_images:
            url = k['url']
            width = k['width']
            height = k['height']

            external_image_id: str | None = None

            if url in [image[1] for image in external_images_in_db]:
                # logger.info(f"External image already exists in DB: {url}")
                for k in external_images_in_db:
                    if k[1] == url:
                        external_image_id = k[0]
                        break
            else:
                external_image_id = create_id()
                external_image_to_add = ExternalImage(
                    id=external_image_id, url=url, width=width, height=height)

                external_images_in_db.append((external_image_id, url))

                logger.info(
                    f"Adding external image {external_image_id} to playlist: {name}")

                session.merge(external_image_to_add)
                session.flush()

            stmt: Insert = insert(playlist_external_images).values(
                playlist_id=id,
                external_image_id=external_image_id
            ).on_conflict_do_nothing()
            # logger.info(
            #     f"Adding external image to playlist_external_images: {id=} {external_image_id=}")
            session.execute(stmt)

        for song in songs:
            song_id = song['id']
            added_at = song['added_at']

            # dt = datetime.strptime(added_at, "%Y-%m-%dT%H:%M:%SZ")

            if added_at is None or added_at == "":
                added_at = get_utc_date()

            formatted = parse_any_datetime(
                added_at).strftime("%Y-%m-%d %H:%M:%S.%f")

            if song_id not in songs_in_db_id:
                logger.error(
                    f"Skipping song {song_id} in playlist {id} because it does not exist in the database")
                continue

            stmt: Insert = insert(playlist_songs).values(
                playlist_id=id,
                song_id=song_id,
                added_by=None,
                date_added=formatted,
                disabled=False
            ).on_conflict_do_nothing()

            session.execute(stmt)

    session.commit()
    logger.info("Added all playlists and their external images.")


def add_artists():

    unique_artists = set()

    for artist in artists_to_add:
        if artist["id"] not in unique_artists:
            unique_artists.add(artist["id"])

    unique_artists = list(unique_artists)
    unique_artists.sort()

    genres_in_db = session.query(Genre).all()
    genres_in_db = [(str(genre.id), str(genre.name)) for genre in genres_in_db]

    artists_in_db = session.query(Artist).all()
    unique_artists = [artist for artist in unique_artists if artist not in [
        a.id for a in artists_in_db]]

    logger.info(f"Unique artists to add: {len(unique_artists)}")

    for k in range(math.ceil(len(unique_artists)/50)):
        response = api_call(
            path=f"artists", params={"ids": ",".join(unique_artists[k*50:(k + 1)*50])})

        if not response:
            logger.error("Response is None")
            continue

        for artist in response["artists"]:
            artist_to_add = Artist(
                id=artist["id"],
                name=artist["name"],
                followers=artist["followers"]["total"],
                popularity=artist["popularity"]
            )

            session.merge(artist_to_add)
            session.flush()

            for image in artist["images"]:
                url = image["url"]
                width = image["width"]
                height = image["height"]

                external_image_id: str | None = None

                if url in [url for _, url in external_images_in_db]:
                    # logger.info(f"External image already exists in DB: {url}")
                    for k in external_images_in_db:
                        if k[1] == url:
                            external_image_id = k[0]
                            break
                else:
                    external_image_id = create_id()
                    external_image_to_add = ExternalImage(
                        id=external_image_id, url=url, width=width, height=height)

                    external_images_in_db.append((external_image_id, url))

                    # logger.info(
                    #     f"Adding external image {external_image_id} to artist: {artist['name']}")

                    session.merge(external_image_to_add)
                    session.flush()

                stmt = insert(artist_external_images).values(
                    artist_id=artist["id"],
                    external_image_id=external_image_id
                ).on_conflict_do_nothing()
                session.execute(stmt)

            for genre in artist["genres"]:

                genre_id: str | None = None
                if genre in [g[1] for g in genres_in_db]:
                    genre_id = next((
                        str(g[0]) for g in genres_in_db if g[1] == genre), None)
                else:
                    genre_id = create_id(20)
                    genre_to_add = Genre(id=genre_id, name=genre)
                    session.merge(genre_to_add)
                    session.flush()

                    genres_in_db.append((genre_id, genre))

                if genre_id is None:
                    logger.error(
                        f"Skipping genre {genre} for artist {artist['id']} because it does not exist in the database")
                    continue

                stmt = insert(artist_genres).values(
                    artist_id=artist["id"],
                    genre_id=genre_id
                ).on_conflict_do_nothing()
                session.execute(stmt)
                session.flush()

        session.commit()
        # break


def add_song_artists():

    artists_in_db = session.query(Artist).all()

    for song_id, artist_id in song_artists_list:
        if not any(artist.id == artist_id for artist in artists_in_db):
            logger.error(
                f"Skipping song {song_id} with artist {artist_id} because artist does not exist in the database")
            continue
        stmt = insert(song_artists).values(
            song_id=song_id,
            artist_id=artist_id
        ).on_conflict_do_nothing()
        session.execute(stmt)

    session.commit()


def add_album_artists():
    artists_in_db = session.query(Artist).all()

    for album_id, artist_id in album_artists_list:
        if not any(artist.id == artist_id for artist in artists_in_db):
            logger.error(
                f"Skipping song {album_id} with artist {artist_id} because artist does not exist in the database")
            continue

        stmt = insert(album_artists).values(
            album_id=album_id,
            artist_id=artist_id
        ).on_conflict_do_nothing()
        session.execute(stmt)

    session.commit()


if __name__ == "__main__":
    add_internal_images()
    add_albums()
    add_songs()
    add_playlists()
    add_artists()
    add_song_artists()
    add_album_artists()

    logger.info("All data added successfully.")
    session.close()
    engine.dispose()
