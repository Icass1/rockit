
import os  # noqa
import sys


sys.path.append(os.getcwd())  # noqa
sys.path.append(os.getcwd() + "/backend")  # noqa


from sqlalchemy import Boolean, Double, Table, create_engine, Column, String, ForeignKey, Text, Integer, func, DateTime, Enum
from sqlalchemy.orm import declarative_base, relationship, Session, mapped_column, declarative_mixin, Mapped
from sqlalchemy.dialects.postgresql.dml import Insert
from sqlalchemy.dialects.postgresql import insert

from typing import List, Dict, Any, Literal, Tuple
from datetime import datetime
from dateutil import parser
from tqdm import tqdm
import requests
import sqlite3
import base64
import dotenv
import math
import json

from backend.backendUtils import create_id, download_image, get_utc_date, sanitize_folder_name
from backend.constants import IMAGES_PATH
from backend.logger import getLogger
from backend.db.db import RockitDB


from backend.db.associationTables.playlist_external_images import playlist_external_images
from backend.db.associationTables.album_external_images import album_external_images
from backend.db.associationTables.artist_external_images import artist_external_images
from backend.db.associationTables.playlist_songs import playlist_songs
from backend.db.associationTables.song_artists import song_artists
from backend.db.associationTables.album_artists import album_artists
from backend.db.associationTables.artist_genres import artist_genres

from backend.db.ormModels.externalImage import ExternalImageRow
from backend.db.ormModels.internalImage import InternalImageRow
from backend.db.ormModels.download import DownloadRow
from backend.db.ormModels.playlist import PlaylistRow
from backend.db.ormModels.artist import ArtistRow
from backend.db.ormModels.album import AlbumRow
from backend.db.ormModels.genre import GenreRow
from backend.db.ormModels.error import ErrorRow
from backend.db.ormModels.song import SongRow
from backend.db.ormModels.list import ListRow
from backend.db.ormModels.user import UserRow

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

    parsed_params = ""

    for index, k in enumerate(list(params.items())):
        if index != 0:
            parsed_params += "&"
        parsed_params += k[0] + "=" + k[1]

    url = f"https://api.spotify.com/v1/{path}"
    headers = get_auth_header()

    query_url = url + \
        ("?" + parsed_params if len(parsed_params) > 0 else "")

    logger.warning(f"Spotify api call: {query_url}")

    result = requests.get(query_url, headers=headers)
    if result.status_code == 401:
        logger.info("Token espired")
        get_token()
        headers = get_auth_header()
        result = requests.get(query_url, headers=headers)

    try:
        return json.loads(result.content)
    except:
        logger.critical(
            f"Unable to load json. {result.content=}, {result.text=} {result.status_code=}")


def parse_any_datetime(s: str) -> datetime:
    return parser.parse(s)


def get_spotify_data(ids: List[str], data_name: Literal["album"] | Literal["artist"] | Literal["track"]) -> List[Dict]:
    """
    Searches for albums in cache or via Spotify API.
    """
    with open(f"cache/{data_name}s.json", "r") as f:
        data = json.load(f)

    missing_data: List[str] = []
    result: List[Dict] = []

    for id in ids:
        for album in data:
            if album["id"] == id:
                result.append(album)
                break
        else:
            missing_data.append(id)

    logger.info(f"{len(result)} {data_name}s found in cache")
    logger.info(f"Missing {data_name}s: {len(missing_data)}")

    for k in range(math.ceil(len(missing_data)/20)):
        response = api_call(
            path=f"{data_name}s", params={"ids": ",".join(missing_data[k*20:(k + 1)*20])})

        if not response:
            logger.error("Response is None")
            continue

        result.extend(response[f"{data_name}s"])

        logger.info(f"{data_name}s cache length: {len(result)}")

        with open(f"cache/{data_name}s.json", "w") as f:
            json.dump(result, f)

    return result


get_token()

rockit_db = RockitDB()

session = rockit_db.session

conn = sqlite3.connect(
    'file:database/database-prod.db?mode=ro', check_same_thread=False)
cursor = conn.cursor()


external_images_in_db: List[ExternalImageRow] = session.query(
    ExternalImageRow).all()
internal_images_in_db: List[InternalImageRow] = session.query(
    InternalImageRow).all()
albums_in_db: List[AlbumRow] = session.query(AlbumRow).all()
lists_in_db: List[ListRow] = session.query(ListRow).all()
songs_in_db: List[SongRow] = session.query(SongRow).all()

cursor.execute("PRAGMA table_info(playlist);")
print(",".join([column[1] for column in cursor.fetchall()]))

artists_to_add = []


song_artists_list: List[Tuple[int, int]] = []
album_artists_list: List[Tuple[int, str]] = []


def add_internal_images():
    cursor.execute("SELECT id,path,url FROM image")
    images = cursor.fetchall()
    paths = []
    for image in tqdm(images, desc="Adding internal images"):

        id = image[0]
        path = image[1]
        url = image[2]

        if path in paths:
            logger.error(f"Path already exists: {path} {id}")
            continue

        paths.append(path)

        # logger.info(f"Adding internal_image: {id=} {path=} {url=}")

        found = False
        for k in internal_images_in_db:
            if k.path == path:
                found = True
                break

        if found:
            continue

        image_to_add = InternalImageRow(
            public_id=id,
            url=url,
            path=path)

        internal_images_in_db.append(image_to_add)

        session.merge(image_to_add)

    session.commit()
    logger.info("Added all internal images.")


def add_albums():
    """
    Add albums and their external images to the database.
    """

    cursor.execute(
        "SELECT id,type,images,image,name,releaseDate,artists,copyrights,popularity,genres,songs,discCount,dateAdded FROM album")
    albums = cursor.fetchall()

    for album in tqdm(albums, desc="Adding albums"):
        public_id: str = album[0]
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

        found = False
        for album_in_db in albums_in_db:
            if album_in_db.public_id == public_id:
                album_artists_list.extend(
                    [(album_in_db.id, artist["id"]) for artist in artists])
                found = True
                break

        if found:
            continue

        if internal_image_id == "":
            logger.error(
                f"Skipping album {public_id} with empty internal_image_id")
            continue

        for k in internal_images_in_db:
            if k.public_id == internal_image_id:
                internal_image_id = k.id
                break

        # Get int id of list. If it does not exist, create it.
        album_id: int | None = None

        for list_in_db in lists_in_db:
            if list_in_db.public_id == public_id:
                album_id = list_in_db.id
                break

        if not album_id:
            list_to_add = ListRow(
                type="album",
                public_id=public_id
            )

            list_to_add: ListRow = session.merge(list_to_add)
            session.flush()

            album_id: int | None = list_to_add.id

        if not album_id:
            logger.error(f"Failed to get album_id for album {public_id}")
            continue

        # Add to album_artists_list for later processing
        album_artists_list.extend([(album_id, artist["id"])
                                  for artist in artists])

        albums_to_add = AlbumRow(
            id=album_id,
            public_id=public_id,
            name=name,
            internal_image_id=internal_image_id,
            release_date=release_date,
            disc_count=disc_count,
            popularity=popularity
        )

        albums_to_add = session.merge(albums_to_add)

        albums_in_db.append(albums_to_add)

        for k in external_images:
            url = k['url']
            width = k['width']
            height = k['height']

            external_image_id: int | None = None

            for external_image in external_images_in_db:
                if external_image.url == url:
                    external_image_id = external_image.id
                    break

            else:
                external_image_public_id = create_id()
                external_image_to_add = ExternalImageRow(
                    public_id=external_image_public_id, url=url, width=width, height=height)

                external_image_to_add: ExternalImageRow = session.merge(
                    external_image_to_add)
                session.flush()
                external_images_in_db.append(external_image_to_add)

                external_image_id = external_image_to_add.id

            stmt = insert(album_external_images).values(
                album_id=album_id,
                external_image_id=external_image_id
            ).on_conflict_do_nothing()
            session.execute(stmt)

    session.commit()

    logger.info("Added all albums and their external images.")


def download_and_add_to_db_albums_data(ids: List[str]):
    """
    Download albums data from Spotify API and add to database.
    """

    for album in tqdm(get_spotify_data(ids, "album"), desc="Downloading albums data"):

        # Download external image if not already downloaded.
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

        # Check if image already exists in DB. If not, add it and get its id.
        image: InternalImageRow | None = None

        for internal_image in internal_images_in_db:
            if internal_image.path == image_path:
                image = internal_image
                break

        if image:
            image_id = image.id
        else:
            image_public_id = create_id(20)

            image_to_add = InternalImageRow(
                public_id=image_public_id,
                url=image_url,
                path=image_path
            )

            image_to_add = session.merge(image_to_add)
            session.flush()
            internal_images_in_db.append(image_to_add)
            image_id = image_to_add.id

        # Add artists to artists_to_add for later processing
        artists_to_add.extend(album["artists"])

        # Get int id of list. If it does not exist, create it.
        album_id: int | None = None

        for list_in_db in lists_in_db:
            if list_in_db.public_id == album["id"]:
                album_id = list_in_db.id
                break

        if not album_id:
            list_to_add = ListRow(
                type="album",
                public_id=album["id"]
            )

            list_to_add: ListRow = session.merge(list_to_add)
            session.flush()

            album_id: int | None = list_to_add.id

        album_to_add = AlbumRow(
            id=album_id,
            public_id=album["id"],
            name=album["name"],
            internal_image_id=image_id,
            release_date=album["release_date"],
            disc_count=len(album.get("disc_number", [])),
            popularity=album.get("popularity", 0)
        )

        album_to_add = session.merge(album_to_add)

        albums_in_db.append(album_to_add)

        album_artists_list.extend(
            [(album_id, artist["id"]) for artist in album["artists"]])

        for album_image in album["images"]:
            url = album_image['url']
            width = album_image['width']
            height = album_image['height']

            external_image_id: int | None = None

            for external_image in external_images_in_db:
                if external_image.url == url:
                    external_image_id = external_image.id
                    break
            else:
                external_image_public_id = create_id()
                external_image_to_add = ExternalImageRow(
                    public_id=external_image_public_id, url=url, width=width, height=height)

                external_image_to_add: ExternalImageRow = session.merge(
                    external_image_to_add)
                session.flush()

                external_image_id = external_image_to_add.id

                external_images_in_db.append(external_image_to_add)

            stmt = insert(album_external_images).values(
                album_id=album_id,
                external_image_id=external_image_id
            ).on_conflict_do_nothing()
            session.execute(stmt)

    session.commit()


def add_songs():

    cursor.execute("SELECT id,name,artists,genres,discNumber,albumName,albumArtist,albumType,albumId,isrc,duration,date,trackNumber,publisher,path,images,image,copyright,downloadUrl,lyrics,dynamicLyrics,popularity,dateAdded FROM song")
    songs = cursor.fetchall()

    # Get list of songs without isrc that are not in the database.
    # Songs in database are skipped because they already have an isrc.
    songs_without_isrc: List[str] = [song[0]
                                     for song in songs if (song[9] == "" or song[9] is None) and song[0] not in [song.public_id for song in songs_in_db]]

    logger.info(f"Songs without ISRC: {len(songs_without_isrc)}")

    missing_albums = set()
    for song in songs:
        album_id = song[8]
        if album_id is None or album_id == "":
            logger.error(
                f"Skipping song {song[0]} with empty album_id")
            continue

        if album_id not in missing_albums and album_id:
            missing_albums.add(album_id)

    missing_albums = list(missing_albums)
    missing_albums.sort()

    logger.info(f"Missing albums: {len(missing_albums)}")

    download_and_add_to_db_albums_data(missing_albums)

    songs_isrc: Dict[str, str] = {}

    for k in get_spotify_data(songs_without_isrc, "track"):
        songs_isrc[k["id"]] = k["external_ids"]["isrc"]

    with open("db/songs_isrc.json", "w") as f:
        json.dump(songs_isrc, f, indent=4)

    for song in tqdm(songs, desc="Adding songs"):
        id = song[0]
        name = song[1]
        artists = json.loads(song[2])
        genres: List[str] = json.loads(song[3])
        disc_number = song[4]
        album_name = song[5]
        album_artist = json.loads(song[6])
        album_type = song[7]
        album_public_id = song[8]
        isrc = song[9]
        duration = song[10]
        date = song[11]
        track_number = song[12]
        publisher = song[13]
        path = song[14]
        external_images = json.loads(song[15])
        internal_image_public_id = song[16]
        copyright = song[17]
        download_url = song[18]
        lyrics = song[19]
        dynamic_lyrics = song[20]
        popularity = song[21]

        artists_to_add.extend(artists)

        found = False
        for song_in_db in songs_in_db:
            if song_in_db.public_id == id:
                found = True

                song_artists_list.extend(
                    [(song_in_db.id, artist["id"]) for artist in artists])
                break

        if found:
            continue

        if isrc == "" or isrc is None:
            if id in songs_isrc:
                isrc = songs_isrc[id]
            else:
                logger.error(f"Skipping song {id} with empty ISRC")
                continue

        internal_image_id: int | None = None
        for k in internal_images_in_db:
            if k.public_id == internal_image_public_id:
                internal_image_id = k.id
                break

        album_id: int | None = None
        for album in albums_in_db:
            if album.public_id == album_public_id:
                album_id = album.id
                break

        song_to_add = SongRow(
            public_id=id,
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

        song_to_add = session.merge(song_to_add)
        songs_in_db.append(song_to_add)

        song_artists_list.extend(
            [(song_to_add.id, artist["id"]) for artist in artists])

    session.commit()
    logger.info("Added all songs and external images.")


def add_playlists():

    songs_in_db_id = {song.id for song in songs_in_db}

    cursor.execute(
        "SELECT id,images,name,description,owner,followers,songs,image,updatedAt,createdAt FROM playlist")
    playlists = cursor.fetchall()

    for playlist in tqdm(playlists, desc="Adding playlists"):
        public_id = playlist[0]
        external_images = json.loads(playlist[1])
        name = playlist[2]
        description = playlist[3]
        owner = playlist[4]
        followers = playlist[5]
        songs = json.loads(playlist[6])
        internal_image_public_id = playlist[7]
        updated_at = playlist[8]
        created_at = playlist[9]

        # Get int id of list. If it does not exist, create it.
        playlist_id: int | None = None

        for list_in_db in lists_in_db:
            if list_in_db.public_id == public_id:
                playlist_id = list_in_db.id
                break

        if not playlist_id:
            list_to_add = ListRow(
                type="album",
                public_id=public_id
            )

            list_to_add: ListRow = session.merge(list_to_add)
            session.flush()

            playlist_id: int | None = list_to_add.id

        if not playlist_id:
            logger.error(
                f"Failed to get alplaylist_idbum_id for album {public_id}")
            continue

        internal_image_id: int | None = None
        for k in internal_images_in_db:
            if k.public_id == internal_image_public_id:
                internal_image_id = k.id
                break

        playlist_to_add = PlaylistRow(
            id=playlist_id,
            public_id=public_id,
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

            external_image_id: int | None = None

            for external_image in external_images_in_db:
                if external_image.url == url:
                    external_image_id = external_image.id
                    break

            else:
                external_image_public_id = create_id()
                external_image_to_add = ExternalImageRow(
                    public_id=external_image_public_id, url=url, width=width, height=height)

                external_image_to_add: ExternalImageRow = session.merge(
                    external_image_to_add)
                session.flush()
                external_images_in_db.append(external_image_to_add)

                external_image_id = external_image_to_add.id

            stmt = insert(playlist_external_images).values(
                playlist_id=playlist_id,
                external_image_id=external_image_id
            ).on_conflict_do_nothing()
            session.execute(stmt)

        for song in songs:
            song_public_id = song['id']
            added_at = song['added_at']

            song_id: int | None = None
            for song_in_db in songs_in_db:
                if song_in_db.public_id == song_public_id:
                    song_id = song_in_db.id
                    break

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
                playlist_id=playlist_id,
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

    genres_in_db = session.query(GenreRow).all()

    artists_in_db = session.query(ArtistRow).all()
    unique_artists = [artist for artist in unique_artists if artist not in [
        a.public_id for a in artists_in_db]]

    logger.info(f"Unique artists to add: {len(unique_artists)}")

    for artist in tqdm(get_spotify_data(unique_artists, "artist"), desc="Downloading artists data"):

        found = False
        for artist_in_db in artists_in_db:
            if artist_in_db.public_id == artist["id"]:
                logger.error(f"This sould not happen {artist=}")
                found = True
                break

        if found:
            continue

        artist_to_add = ArtistRow(
            public_id=artist["id"],
            name=artist["name"],
            followers=artist["followers"]["total"],
            popularity=artist["popularity"]
        )

        artist_to_add = session.merge(artist_to_add)
        artists_in_db.append(artist_to_add)
        session.flush()

        for image in artist["images"]:
            url = image["url"]
            width = image["width"]
            height = image["height"]

            external_image_public_id: str | None = None

            for external_image in external_images_in_db:
                if external_image.url == url:
                    external_image_id = external_image.id
                    break

            else:
                external_image_public_id = create_id()
                external_image_to_add = ExternalImageRow(
                    public_id=external_image_public_id, url=url, width=width, height=height)

                external_image_to_add: ExternalImageRow = session.merge(
                    external_image_to_add)
                session.flush()
                external_images_in_db.append(external_image_to_add)

                external_image_id = external_image_to_add.id

            stmt = insert(artist_external_images).values(
                artist_id=artist_to_add.id,
                external_image_id=external_image_id
            ).on_conflict_do_nothing()
            session.execute(stmt)

        for genre in artist["genres"]:

            genre_id: int | None = None
            for genre_in_db in genres_in_db:
                if genre_in_db.name == genre:
                    genre_id = genre_in_db.id
                    break
            else:
                genre_to_add = GenreRow(
                    public_id=create_id(),
                    name=genre
                )
                genre_to_add = session.merge(genre_to_add)
                session.flush()
                genres_in_db.append(genre_to_add)
                genre_id = genre_to_add.id

            stmt = insert(artist_genres).values(
                artist_id=artist_to_add.id,
                genre_id=genre_id
            ).on_conflict_do_nothing()
            session.execute(stmt)
            session.flush()

    session.commit()

    logger.info("Added all artists and their external images and genres.")


def add_song_artists():

    artists_in_db = session.query(ArtistRow).all()

    logger.info(f"Adding {len(song_artists_list)} song artists...")

    for song_id, artist_public_id in tqdm(song_artists_list, desc="Adding song artists"):
        for artist_in_db in artists_in_db:
            if artist_in_db.public_id == artist_public_id:
                artist_id = artist_in_db.id
                break
        else:
            logger.error(
                f"Skipping album {song_id} with artist {artist_public_id} because artist does not exist in the database")
            continue

        stmt = insert(song_artists).values(
            song_id=song_id,
            artist_id=artist_id
        ).on_conflict_do_nothing()
        session.execute(stmt)

    session.commit()


def add_album_artists():
    artists_in_db = session.query(ArtistRow).all()

    logger.info(f"Adding {len(album_artists_list)} album artists...")

    for album_id, artist_public_id in tqdm(album_artists_list, desc="Adding album artists"):

        for artist_in_db in artists_in_db:
            if artist_in_db.public_id == artist_public_id:
                artist_id = artist_in_db.id
                break
        else:
            logger.error(
                f"Skipping album {album_id} with artist {artist_public_id} because artist does not exist in the database")
            continue

        stmt = insert(album_artists).values(
            album_id=album_id,
            artist_id=artist_id
        ).on_conflict_do_nothing()
        session.execute(stmt)

    session.commit()


if __name__ == "__main__":
    # add_internal_images()
    # add_albums()
    # add_songs()
    # add_playlists()
    # add_artists()
    # add_song_artists()
    # add_album_artists()

    logger.info("All data added successfully.")
    session.close()
    # engine.dispose()
