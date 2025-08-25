import sys
import os

sys.path.append(os.getcwd())  # noqa
sys.path.append(os.getcwd() + "/backend")  # noqa

from sqlalchemy.dialects.postgresql.dml import Insert
from sqlalchemy.dialects.postgresql import insert

from typing import List, Dict, Any, Literal, Tuple
from datetime import datetime, timezone
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
from backend.db.associationTables.artist_external_images import artist_external_images
from backend.db.associationTables.album_external_images import album_external_images
from backend.db.associationTables.user_history_songs import user_history_songs
from backend.db.associationTables.user_pinned_lists import user_pinned_lists
from backend.db.associationTables.user_liked_songs import user_liked_songs
from backend.db.associationTables.user_queue_songs import user_queue_songs
from backend.db.associationTables.playlist_songs import playlist_songs
from backend.db.associationTables.album_artists import album_artists
from backend.db.associationTables.artist_genres import artist_genres
from backend.db.associationTables.song_artists import song_artists
from backend.db.associationTables.user_lists import user_lists

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


def parse_any_datetime(s: str | int) -> datetime:

    if isinstance(s, int):
        return datetime.fromtimestamp(s/1000, timezone.utc,)

    return parser.parse(s)


def get_spotify_data(ids: List[str], data_name: Literal["album"] | Literal["artist"] | Literal["track"]) -> List[Dict]:
    """
    Searches for albums in cache or via Spotify API.
    """
    with open(f".spotify_cache/{data_name}s.json", "r") as f:
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

    max_data_per_call: int = 20
    if data_name == "track":
        max_data_per_call = 100
    elif data_name == "artist":
        max_data_per_call = 50
    elif data_name == "album":
        max_data_per_call = 20

    for k in range(math.ceil(len(missing_data)/max_data_per_call)):
        response = api_call(
            path=f"{data_name}s", params={"ids": ",".join(missing_data[k*max_data_per_call:(k + 1)*max_data_per_call])})

        if not response:
            logger.error("Response is None")
            continue

        result.extend(response[f"{data_name}s"])
        data.extend(response[f"{data_name}s"])

        logger.info(f"{data_name}s cache length: {len(data)}")

        with open(f".spotify_cache/{data_name}s.json", "w") as f:
            json.dump(data, f)

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

cursor.execute("PRAGMA table_info(user);")
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

    ids = list(set(ids))

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


def download_and_add_to_db_songs_data(ids: List[str]):

    ids = list(set(ids))

    albums_in_db = session.query(AlbumRow).all()

    for song in tqdm(get_spotify_data(ids, "track"), desc="Downloading songs data"):
        public_id = song["id"]
        name = song["name"]
        isrc = song["external_ids"]["isrc"]
        duration = song["duration_ms"]/1000
        track_number = song["track_number"]
        disc_number = song["disc_number"]
        popularity = song["popularity"]
        album_public_id = song["album"]["id"]

        album_id: int | None = None
        for album in albums_in_db:
            if album.public_id == album_public_id:
                album_id = album.id
                break

        internal_image_id: int | None = None
        for album_in_db in albums_in_db:
            if album_in_db.public_id == album_public_id:
                internal_image_id = album_in_db.internal_image_id
                break
        else:
            logger.error(
                f"Skipping song {public_id=} album not found {album_public_id=}")
            continue

        song_to_add = SongRow(
            public_id=public_id,
            name=name,
            duration=duration,
            track_number=track_number,
            disc_number=disc_number,
            popularity=popularity,
            internal_image_id=internal_image_id,
            path=None,
            album_id=album_id,
            isrc=isrc,
            download_url=None,
            lyrics=None,
            dynamic_lyrics=None
        )

        song_to_add = session.merge(song_to_add)

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


def add_users():

    songs_in_db = session.query(SongRow).all()
    albums_in_db = session.query(AlbumRow).all()
    playlists_in_db = session.query(PlaylistRow).all()
    lists_in_db = session.query(ListRow).all()

    cursor.execute("SELECT id,username,passwordHash,lists,lastPlayedSong,currentList,currentSong,currentTime,queue,queueIndex,pinnedLists,randomQueue,volume,admin,superAdmin,devUser,showLyrics,updatedAt,createdAt,likedSongs,lang,repeatSong,impersonateId,currentStation,crossFade,libraryView FROM user")
    users = cursor.fetchall()

    user_lists_values = []
    user_history_songs_values = []
    user_queue_songs_values = []
    user_pinned_lists_values = []
    user_liked_songs_values = []

    for user in tqdm(users, desc="Adding users"):
        public_id = user[0]
        username = user[1]
        password_hash = user[2]
        lists = json.loads(user[3])
        last_played_song = json.loads(user[4] if user[4] else "[]")
        current_list = user[5]
        current_song = user[6]
        current_time = user[7]
        queue = json.loads(user[8])
        queue_index = user[9]
        pinned_lists = json.loads(user[10])
        random_queue = user[11]
        volume = user[12]
        admin = user[13]
        super_admin = user[14]
        dev_user = user[15]
        show_lyrics = user[16]
        updated_at = user[17]
        created_at = user[18]
        liked_songs = json.loads(user[19])
        lang = user[20]
        repeat_song = user[21]
        impersonate_id = user[22]
        current_station = user[23]
        cross_fade = user[24]
        library_view = user[25]

        found = False
        for user_in_db in session.query(UserRow).all():
            if user_in_db.public_id == public_id:
                # Add user history songs.
                for song_public_id in last_played_song:
                    dates: List[int | str] = last_played_song[song_public_id]
                    for song_in_db in songs_in_db:
                        if song_in_db.public_id == song_public_id:
                            song_id = song_in_db.id
                            break
                    else:
                        logger.error(
                            f"Skipping song {song_public_id} in user {public_id} last played songs because it does not exist in the database")
                        continue

                    for date in dates:
                        user_history_songs_values.append({"user_id": user_in_db.id,
                                                          "song_id": song_id,
                                                          "played_at": parse_any_datetime(date)})

                # Add user library lists.
                for list in lists:
                    # list ej: {"createdAt":1753826009495,"type":"album","id":"6ZT56fuNORmVhYclVoaTiu"}
                    list_public_id = list["id"]
                    list_type = list["type"]

                    list_id: int | None = None

                    if list_type == "album":
                        for album_in_db in albums_in_db:
                            if album_in_db.public_id == list_public_id:
                                list_id = album_in_db.id
                                break
                        else:
                            logger.error(
                                f"Skipping album {list_public_id} in user {public_id} lists because it does not exist in the database")
                            continue
                    elif list_type == "playlist":
                        for playlist_in_db in playlists_in_db:
                            if playlist_in_db.public_id == list_public_id:
                                list_id = playlist_in_db.id
                                break
                        else:
                            logger.error(
                                f"Skipping playlist {list_public_id} in user {public_id} lists because it does not exist in the database")
                            continue
                    else:
                        logger.error(
                            f"Skipping list {list_public_id} in user {public_id} lists because it has unknown type {list_type}")
                        continue

                    user_lists_values.append(
                        {"user_id": user_in_db.id, "list_id": list_id})

                # Add user queue songs.
                for item in queue:
                    # item ej: {"song":"1HibhNhwk2tljwC4BGGLXV","index":7,"list":{"type":"album","id":"2ZytN2cY4Zjrr9ukb2rqTP"}}

                    if isinstance(item, str):
                        logger.error(
                            f"Skipping item in user {public_id} queue because it is a string: {item}")
                        continue
                    song_public_id = item["song"]
                    list = item["list"]
                    list_public_id = list["id"]
                    list_type = list["type"]
                    index = item["index"]
                    list_id: int | None = None

                    if list_type == "album":
                        for album_in_db in albums_in_db:
                            if album_in_db.public_id == list_public_id:
                                list_id = album_in_db.id
                                break
                        else:
                            logger.error(
                                f"Skipping album {list_public_id} in user {public_id} queue because it does not exist in the database")
                            continue
                    elif list_type == "playlist" and list_public_id == "liked":
                        list_id = None
                    elif list_type == "playlist" and list_public_id == "recent-mix":
                        list_id = None
                    elif list_type == "playlist":
                        for playlist_in_db in playlists_in_db:
                            if playlist_in_db.public_id == list_public_id:
                                list_id = playlist_in_db.id
                                break
                        else:
                            logger.error(
                                f"Skipping playlist {list_public_id} in user {public_id} queue because it does not exist in the database")
                            continue
                    elif list_type == "recently-played":
                        list_id = None

                    else:
                        logger.error(
                            f"Skipping list {list_public_id} in user {public_id} queue because it has unknown type {list_type}")
                        continue

                    user_queue_songs_values.append({
                        "user_id": user_in_db.id,
                        "song_id": next((song.id for song in songs_in_db if song.public_id == song_public_id), None),
                        "list_id": list_id,
                        "list_type": list_type,
                        "position": index
                    })

                # Add user pinned lists.
                for item in pinned_lists:
                    list_public_id = item["id"]
                    list_type = item["type"]
                    list_id: int | None = None

                    for list_in_db in lists_in_db:
                        if list_in_db.public_id == list_public_id:
                            list_id = list_in_db.id
                            break
                    else:
                        logger.error(
                            f"Skipping list {list_public_id} in user {public_id} pinned lists because it does not exist in the database")
                        continue

                    user_pinned_lists_values.append(
                        {"user_id": user_in_db.id, "list_id": list_id})

                # Add user liked songs.
                for item in liked_songs:
                    song_public_id = item["id"]
                    if "added_at" in item:
                        song_added_at = parse_any_datetime(item["added_at"])
                    else:
                        song_added_at = datetime.now()

                    song_id: int | None = None
                    for song_in_db in songs_in_db:
                        if song_in_db.public_id == song_public_id:
                            song_id = song_in_db.id
                            break
                    else:
                        logger.error(
                            f"Skipping song {song_public_id} in user {public_id} liked songs because it does not exist in the database")
                        continue

                    user_liked_songs_values.append({
                        "user_id": user_in_db.id,
                        "song_id": song_id,
                        "added_at": song_added_at
                    })

                found = True
                break

        if found:
            continue

        user_to_add = UserRow(
            public_id=public_id,
            username=username,
            password_hash=password_hash,
            current_station=current_station,
            current_time=current_time,
            queue_index=queue_index,
            random_queue=random_queue if random_queue is not None else False,
            repeat_song=repeat_song if repeat_song in [
                "off", "one", "all"] else "off",
            volume=volume if volume is not None else 1,
            cross_fade=cross_fade if cross_fade is not None else 0,
            lang=lang if lang is not None else "en",
            admin=admin if admin is not None else False,
            super_admin=super_admin if super_admin is not None else False
        )

        session.merge([user_to_add])

    if len(user_lists_values) > 0:
        stmt = insert(user_lists).values(
            user_lists_values
        ).on_conflict_do_nothing()
        session.execute(stmt)

    if len(user_history_songs_values) > 0:
        stmt = insert(user_history_songs).values(
            user_history_songs_values
        ).on_conflict_do_nothing()
        session.execute(stmt)

    if len(user_queue_songs_values) > 0:
        stmt = insert(user_queue_songs).values(
            user_queue_songs_values
        ).on_conflict_do_nothing()
        session.execute(stmt)

    if len(user_pinned_lists_values) > 0:
        stmt = insert(user_pinned_lists).values(
            user_pinned_lists_values
        ).on_conflict_do_nothing()
        session.execute(stmt)

    if len(user_liked_songs_values) > 0:
        stmt = insert(user_liked_songs).values(
            user_liked_songs_values
        ).on_conflict_do_nothing()
        session.execute(stmt)

    session.commit()


if __name__ == "__main__":
    # add_internal_images()
    add_albums()
    # add_songs()
    # add_playlists()
    # add_artists()
    # add_song_artists()
    # add_album_artists()
    # add_users()
    # download_and_add_to_db_albums_data(['6G9PvX9f6Dq26JzsiVHIdl', '18fOLsMG8Msf1DEaW0E71K', '2nE5WmbSq3qbyDrOpSTlnq', '5MAL7e4EnKXW1hFg6NbFqP', '4LH4d3cOWNNsVw41Gqt2kv', '4LH4d3cOWNNsVw41Gqt2kv', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '5qSfqoD1O3P45CYysXlpOo', '6FMu88LoghMcmme2aDkK3S', '0bgjJ99UFbk0yBOzjJl7cq', '5cwUCXPFFfNsnk4qipc40D', '47fRf3JwriMUPPzFjdvNS6', '2OyVtIEp7O7a6o82DF4Ba5', '5FfkiNcXAvagExRCLd8nn4', '0j12QW17dkUCCI7eOAiT1r', '35KafpmKh0nDLzBLV75MpR', '6OMYQUITdN6wBaWfEtgooI', '3REUXdj5OPKhuDTrTtCBU0', '4rQV5S9FhajZdyzFfcyYw9', '6CoeDRu0SmpFtLZMcRTO2F', '3ZdkT5buYFi1WQaB0XNNtf', '3ZdkT5buYFi1WQaB0XNNtf', '5Vdzprr5cOqXQo44eHeV7t', '3srdrIrP3V7LTmRujRfLhK', '1ICKrl6sDjJD1YdR9VDfPR', '54DjkEN3wdCQgfCTZ9WjdB', '2coqGqbnSCAy740mClWesA', '1j57Q5ntVi7crpibb0h4sv', '4HDJMKkwAMVFewqfZcmf84', '65Uo74eW8L3zXUxSOlSm6H', '2cKZfaz7GiGtZEeQNj1RyR', '71cfSO0iO1fjgQLEb3Wc6C', '78hVLZZJhaXgrnfXKc6yxF', '7MD06W6wJm7J6jqkBszV22', '1O2sEdKLsSHROEyYgUQmnb', '31TRqoVBTQi0lzlPLtvINn', '3t3BbpFJiGcXl4jI5CRLLA', '243XzHQegX82bPnUVQ0SPV', '3hgAoHSmany3EiKL0Aqh3G', '1UUOBzIHw0noiRGRpbt3sz', '0R8Pl54TXSwXWtAEVaP7ew', '1JDlLoZugxdneiaTnGyaKr', '0VPad241NfcHMOXcRcLrDe', '3wCe8HjHk6QNGcf5D3jgW1', '05owfigVGpgPe7RKJG1hum', '1B4oPgG5ljWTRxsKcTHAYn', '56dfEbntfVTMCxjrjggL1e', '02CxAhdSRhzcm6XQ8m5RNp', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '7iLuHJkrb9KHPkMgddYigh', '3iMwQk5yE0UDDKbLCdcxZA', '3VNTh6evo3MyUsStAiatcY', '5jkwdY6jS1Hzi8epr6HW7h', '1Ghv7iViywM23K8BRFggQv', '08jWgM4vSkTose4blKBWov', '5WndWfzGwCkHzAbQXVkg2V', '34SBayfOPJb9ztyCTvS3no', '6FTFKwFEs3hwpnj68VKXg3', '2FsaIC8jrXvWGIfokVZ4Jg', '033cvSPAuSU5ArRfIgQSDU', '0X4ZNTZw7SYgrp5rlBQC3N', '4gouGcdQn9OvjX42xnWrF0', '2nPJlUlcyQ24e1VdayD6TT', '5Yi08NDFoVAnvHoXqpp9O5', '3g5K7IOTOSY6nIfu7lj562', '0Zf6FJVyK6qUxmg1WMNruG', '2qSwmENEVYoacaxatupAaE', '61xN74Rar4MojQJ9ssqSKB', '1kHbPoLRmiAHIDgYRraYU9', '1yc1L4kNOK9mu44coyKX9s', '3T0Rxzvmk3nQcTfqggJIsD', '5TkfP3cqWgeBvCugPeiGNl', '4l4u9e9jSbotSXNjYfOugy', '64q58AfjSrrX9Egp7Zryw8', '2JxEUrs4GzHQdkV6qQayz5', '29m6DinzdaD0OPqWKGyMdz', '6oU298pdPTCQnMx1PYwyUA', '0F77QekrNe8vVAjU2sepja', '6b5osVLAcVTBvnqwDaPV4w', '0ib2UtSmLGssyqyoY6X8cm', '3SsNd5MeJKc1IK3nazaWg2', '6iVOz2hudE6dv5Yrcsw2c9', '4VykjLwkyfKMZVLrJJVrYh', '7oIftk0P8cViwNpNEdCYl2', '3gPlX9Zs3tXZZKNCyoOkSm', '23enz9nXJhH1BR1Rm5CzDJ', '3REUXdj5OPKhuDTrTtCBU0', '3UBqHwvxUDl6jWxY2RhmrN', '43L4t2oVmuJsudEls5C6Gh', '0tJT9ZnxnlElGa34DRj59l', '6zpu2C7qPjXrhv5cyuLNZn', '2blsPE3sO5SnroFjfEAlfj', '6DlSUW5gmq6Byc3osKDJ2p', '7tDrvcJnNTSIaFmRJVhagA', '4YimfceN1R0nOS9CefIFhm', '6DlSUW5gmq6Byc3osKDJ2p', '4gouGcdQn9OvjX42xnWrF0', '3pZ6D15onAaT2YyiTbcHmh', '1w7JOjdpfTBz4rvhWQDWJz', '48MhNEYxMJvcBbqz85UTQP', '48MhNEYxMJvcBbqz85UTQP', '274tWwrhGJy0IFeMENjWi7', '1DCI0mQQdf0LYoXheONDXi', '391ScNR3xKywWSpfDwP3n0'])
    # download_and_add_to_db_songs_data(["3oUphdZVPyrsprZ8FgbmQS","1yN2z5XVtaAOYGdeEqEuqd","7HKxTNVlkHsfMLhigmhC0I","7yBl8YmvcgwwYlazJcvowE","1WgOedf4pKmgepml1CMW6o","60e5PcqGmlVFQ0HHgUagCJ","6dzrCHBBKutQezMkeWaOEY","1efuoLEUL1K0D96d63svRO","4FNm4ZJaUVLDCMXcqwS6zY","2sevvnMrqH607r5lwk3kFT","0QyBdoz2JktWEo111DBEx9","0q5giEtY4wsFTwjWqswLwx","4r9hiElqKWMPT4Z3vN2exq","6XQHlsNu6so4PdglFkJQRJ","4f6PUDRYJI51UrZy0jDAxD","70RecAVg5QudOXfJs64sM5","1Vk4yRsz0iBzDiZEoFMQyv","762K1h8yVV5IgAVuEMpqfZ","39ncDMVidHOeQgeC5anYZM","4S3DXtdTdgOIezKgu8DR0M","1plcM0XlbKdjND7Ufokuzb","42pqNrGr0TZz5bzdCXt4sw","36N7FB6SiOxmnjwjfjTcSG","4LqaFJOawdPH1JliPDdssk","5iFujkF6DJlRhOyxYl4zjE","4q7tMaar2kUMweKu6N5bZz","51Y1WwassIhqZYBwwaAjzr","06jttXe119nc0r9Brkpn8a","2tBv9tAdqEbLNDi5smSjbg","40d2EcaOOCUjDzzo2YvUWn","3gbwtdRrtD05lz08DTxfFt","5kRBzRZmZTXVg8okC7SJFZ","5BMwpS4iYKR30kq9U9beaT","7gXjNlZlfP1GXRH1WvyuE2","2bonbKENtFAQQh8U4UEAu5","3ykSdTGmYPFl8pDBXer1zG","1tDWVeCR9oWGX8d5J9rswk","0vFOzaXqZHahrZp6enQwQb","2OF5LBNqH7GC9expc1Oatd","4VhiQU99RQ1qUCELJIK44n","5AyEjwO4pC5STlD1gU1wLr","23jsI6wT9St6jfSXgEQKeq","6nczjViR1GmwR1pwZKSpZC","7hZhyg8pMHYoCxaclBkG0L","0xycFQK4tNdLoM9DFE7TSn","4tgUwqjXLDlByyZctSun3c","5SXemxLERs0imkLpe4Aq8v","4PgZTLaGAMlKD6FCATr2sz","2miIOgni3EEut8pvYcxeYn","1e7sKwOgiMF2FBgb8HmlRb","7fYKKFD0jiSlMDgG9IUs1q","62JvDbmEtwIU3m4LhiG6Ah","1lzaRptS63unC0qgT6hm7T","6yVnpVWuT3NdhAmQe05T33","0a93e7F9pOj3dYHTrYb9JO","1MVKUdzL5pA9YlRkQMsb6j","3zJgt8DyC6ypyDnlrxUV8H","3Y0iJfYWOftZxtQUF8wa4f","5Chf7pNfiKfFFhBpbTdcY4","2BMqay80iBzZTa608Y1eG1","5dpRJkvY8oWMQmQbEQTXhO","4OUmlC67FoPLvQNuE5C7kF","0eRyOunOVBChlXxIvqwOxH","0CaBBQsaAiRHhiLmzi7ZRp","2VsX1BoWSGiuVXGiFSUr6h","50qHmeex1nPTyQTwBXjSE4","3zw4FTrVNfy2teEkV9FOvh","5tztLBvTlNC15Np2tnQ5Ll","5maTh4fY9SlgR3FhRkf040","7rgUYidQh5tH0YlXCoKaYJ","7y1hMqXNa0dKQLZH7CKbUG","4ekUX4pWizXXksJe0JfS9U","3idqWaBn3mRdsIodCU6uBi","6wfK1R6FoLpmUA9lk5ll4T","0sIZcoe69iSym9AecvZ7CT","2RvKsA6Ho7VbJkVFiD4UQF","5vl0sRtrQM1BTSAxQZFqEN","0KogQrSowDnZoU8GSpaxkj","7KyUS1fkcA491aobPDCcq1","5393jrdpAwmkq1u0RbP4Wk","0oeM1wuV8lRBJQg3Emvg9c","2F8DsV74G8roccHCegEAeE","2OgEAnBYY0ZTGv1uHgR3rX","6jnmiFauoWEtg5yXLJYzzF","4jhovniliZO54AmswLDA7f","6wdWtY9TSHJkJcqrZYXszh","1GHBv69iqWr9stD2DtMFkv","0K2WjMLZYr09LKwurGRYRE","1vLPTWPfJSIrqOhNUWNfNY","6nqHzwOdGIaX57U6VU6kMO","6hXPFI5fRd4QvWngZSSelM","5XY9FK0mB0BS0u8YB2ehN9","5Oioq6hXx9prdYO5wBTHid","76TFQMhDHtTKMSCGl1wp0r","41q8ZiB3LZl4HRmmzUTIo4","6HWHpSlPPLj7VL6ia625qk","3x11uesIVLyMlgFn7QYsNv","06n4xlUyRu88SKeQW1veOa","6OH9r1lZtmLN04CNefClwg","05mkxgw4kGQnarKMEovShB","066OGJp1Kbxn1OOFY8hbS7","7IzJv4GEEQfoQ6Z5umrleJ","6JNJERZGJwDVgkmbohBw7u","2Di0qFNb7ATroCGB3q0Ka7","71SvEDmsOwIWw1IozsZoMA","2bCQHF9gdG5BNDVuEIEnNk","5dRQUolXAVX3BbCiIxmSsf","0e3yhVeNaTfKIWQRw9U9sY","5WwqdeavrQrbeAMDxGawse","5vmRQ3zELMLUQPo2FLQ76x","05RgAMGypEvqhNs5hPCbMS","5JvsxPAHsGxwNq4xto2HtM","4d6eqRtpDX7tydHJGDZUBQ","3oEkrIfXfSh9zGnE7eBzSV","0J2p4KYdr6Mg4ET6JPlbe1","2tUBqZG2AbRi7Q0BIrVrEj","6mYrhCAGWzTdF8QnKuchXM","36lkJSDyMEZoWTqtRj8Q8q","62LJFaYihsdVrrkgUOJC05","1mCsF9Tw4AkIZOjvZbZZdT","1YrnDTqvcnUKxAIeXyaEmU","3ZZq9396zv8pcn5GYVhxUi","1Qrdlkgg9I4J7r3P4kZNwr","2245x0g1ft0HC7sf79zbYN","58XWGx7KNNkKneHdprcprX","4ZhPLoMzZwewHLLjV1J15c","4wswaG5vmNINMZcVBsAyBP","1eyq8cjUQ2daFthW2PC2GM","2A6yzRGMgSQCUapR2ptm6A","2KH16WveTQWT6KOG9Rg6e2","1CtAzw53AIXKjAemxy4b1j","6pPWRBubXOBAHnjl5ZIujB","0X1sqQ652p1sceKM2nJlIJ","7DFawVSjI88xR9mjnWwURg","2aEuA8PSqLa17Y4hKPj5rr","65HA9FsYyA2xro9RzNlNmy","4ByEFOBuLXpCqvO1kw8Wdm","4uOKFydzAejjSFqYbv1XPt","19Ym5Sg0YyOCa6ao21bdoG","3nFJbZCHP4d9vduKjJLdBL","1hlveB9M6ijHZRbzZ2teyh","2ax1vei61BzRGsEn6ckEdL","5rL2E6ZlMJYMdV799HumhZ","2KbnkNVzg8ubqK5wAXSxf1","09dKenoVuQzPRQ8Anoo6we","3AySFupxPGQWjauQfFXcr0","3QcqUffnkbQGWJlfyaT3yF","31l6t3Jq09uywRTVGbzant","4AWJmxQP5DK2mpQvKecaUB","4WidRX7HuOreEGkQ6tKBBi","4PY3mBItnv6YzN66Sq3Ci4","54b8qPFqYqIndfdxiLApea","31H6au3jhblhr6MMJiXnCq","5lmGgOaixbwKHtpTzjJoqx","19kAUW6NMzgDHKT19s7782","0JuW3zVUYjyW5BbtXq2to6","3hloNY7y2r53Cm3zkR7kZV","3075GFD8j1WFyF1pUGbAuh","6EePCjbtiMeb783pduiEJK","0l49BLiXUhHD2A92ONuQ7k","5Z7Xad6ghivPVONXAJFcst","2aVmwPRiY1DQMPpudL6wuF","1OBlQXdm2yQ2AjtpDhM7yc","1PtJclc46wTk367PlsU6Uj","17OqI90oTFZ3J8PVu6j07V","2TyQF1DcQ8k2cLjiweqQyG","762B4bOcXF7I2Y8UlKTyTy","3R47KOuGuGvmoeQqbODPa3","71or1G6CbfIttRDnBnTTAL","4zoWdR02nRwK8NWqpCM151","0mb5Q9w5GJKU7HClkEzHpy","4IKF9BDHZALfCXYXdS0koQ","3vkQ5DAB1qQMYO4Mr9zJN6","2HPB3px8MJZRMfu1L65Z41","35iCSlFxyiawRBUOtQAkeT","7rWgGyRK7RAqAAXy4bLft9","0odIT9B9BvOCnXfS0e4lB5","0YMFcrMtBowDdD5bPz0cgy","2vX5WL7s6UdeQyweZEx7PP","44aTAUBF0g6sMkMNE8I5kd","1KU5EHSz04JhGg3rReGJ0N","2RWFncSWZEhSRRifqiDNVV","41UXf5Tt4FShNileQJyubw","6rEJ6ncZKq9EM3TwyMhTDo","1xOXXYh6lTW8laxlW7JP2J","1s65HRPwZtSG5dBIBZ0dix","5RgFlk1fcClZd0Y4SGYhqH","54xbcKFYv2PC6ujERHppRj","5Nm9ERjJZ5oyfXZTECKmRt","1H7x0bYvO4rwUOb8fQXfEk","62Qvzu8oG0RIJYDxr90nWR","370wvMsgFk2WFsQfOI7ilP","6vhdFKCPjLBcMvfrBEGRu4","4qUAs5fOf9rGEGq4MTSFDD","2N7GESlJ6Wf5ZhgmpbCn4c","20FnYowQOrLxU92iyA94ed","1IP1ymL87BtfZqCsJTyp4C","1wDOwrbOEQOrcSldtK2riK","5cXHQInwGNOSmOBTqnuYOs","3OtsmzTZs50ahEnHKVvozC","55RzZKWf4ICmLH4ulzkXNG","0IqGdE8K3AguQWVEZ6wEV3","7oNt2nOzTTMCSMbIKP2inQ","1E4FcSqQs7U2RTebCNaYRH","0FARfrl2IDyNURBj1reFWQ","35qzUISYKada65IDfoeOLT","3NRXwFqPsmFe2dpIrT8CzK","1U9KXf8iMIHzNnG0Zb0Mzr","15F4pkkx1np7W93qQfqr80","0h7N5rOgTT1rSwLoj9f3Bk","473McZs08uo5AIimJyAelZ","5BZshzyuOfIGxmVt6RK7vn","3iD2CCv5bsJRIaqJRYD0uJ","2hOC9qItvmSkgMnxRjgPSr","5JCbyeGTxbxMRZICQ0OkZO","7LNiAjyg9P2GKINTtN6Yt8","1kN5RXxIYrSbCgO8ke88rV","5XmetMMUFNXClbiYnGdVmP","5NQYyej46WQkgCbnzGD21W","6TjUg1cTUzWHbal6yQAi7c","2AsGApoUuN8pTM17Lq9eUd","0Bs0hUYxz7REyIHH7tRhL2","4eLIq1nQNwz2qLu8DeiWIp","71LsKf3xISiOlY1mj7FFPP","5Z3Rd1fMcaty8g5Pn7yhBQ","2X9H5BokS1u5O46YpNYNsZ","5FnpXVgDOk2sLT58qM22Of","64P3zpRsDHIk7YTpRtaKYL","4zq4rrfHZeZsTbo5vjJXSV","6j67aNAPeQ31uw4qw4rpLa","5iyCSUM7zzficwaGo8GIoc","7s25THrKz86DM225dOYwnr","3EvpaRZkKWxsgDIO2zMH7g","2vEQ9zBiwbAVXzS2SOxodY","1WeoeHh0TSzsApyJ6Q8OOK","5XcZRgJv3zMhTqCyESjQrF","4rcHWl68ai6KvpXlc8vbnE","43btz2xjMKpcmjkuRsvxyg","5tdKaKLnC4SgtDZ6RlWeal","0TzbmxnYrlMV6dEln2l9nb","5QHtEiV3MEHLwOIqMxZUTV","4My3Flw72nhMNIiwUHI5KU","57ZXcBtCZXSg9TVV5xRdnR","1GeNWyZtCHbcp3ZWp8GTOO","5zWZ9iNevP0397xB3jWV2z","4LFwNJWoj74Yd71fIr1W8x","3PzsbWSQdLCKDLxn7YZfkM","4m2GdLuOhDt6rFbgOFMHIL","2cFsO1qC65joLn2GzRViBI","43YwOmGUOS3zzGvj1Feszb","0xSPEU1jpatIiRniszPjIo","1PgNBlADQqz8NZ3SKttj9l","1roY6Gv8pwLBLqDh5q1Ann","5HcTLesmMaPr0CkwdbtK0o","02Y7UtZLh7SbhYsYG5N7Rr","4wa7EsaCIc31OoedVvkVz6","7K3rmA4f6NEElsxKEOOt8H","0kesmP5jKuavoUDwuoMG3l","0SpNlEAUqNsuij5xi7Z7cQ","1nBufEoW7UXvQWgqmNl6Kx","4Wd9pEtEnZNDjgiswGOpJb","49NDegc7RQyvq6mhAs06p6","6H3kDe7CGoWYBabAeVWGiD","3lN8PP6R2IxbLP05QpYXng","1YqJSpIxdavjQ8BxAttU0r","7MTX3vevnm41xuEoPxWT3j","52dm9op3rbfAkc1LGXgipW","6zeE5tKyr8Nu882DQhhSQI","56dtB7EzO7EneUgYwX8krC","5lQKRR3MdJLtAwNBiT8Cq0","5UwbnHhjnbinJH8TefuQfN","1cU34sZG9kF4FYHCoAD0Ib","1c9dnQbOzw01ID7X2IsYOE","1GcVa4jFySlun4jLSuMhiq","6rovOdp3HgK1DeAMYDzoA7","4SDywo3ykB2PEthjXvo1UP","3VZmChrnVW8JK6ano4gSED","5veJDT0MLsLbhYsx42GXUD","7N3PAbqfTjSEU1edb2tY8j","3L5dCw2G1sNtAaZ0cqUBnY","4ogaI0XfmAunA0LyjveMSF","1FgyYm1kcXjkdR1VZmaiVo","1CAO7hiNOxJRPW4nFv2aRO","3aAuIvgJGdp4wWd60riWfB","17QTsL4K9B9v4rI8CAIdfC","4t0Pj3iBnSCZv5pDEPNmzG","2LXISHBkx8FyoxCBkckh19","1mskmld5ZKEhRaNvYVPoqZ","3fH4KjXFYMmljxrcGrbPj9","1x1XQqhBViz4opcpwc7FVs","67eX1ovaHyVPUinMHeUtIM","49OMJ1prsRA7ZYgrAjz70c","0l5TpsCL1ObiTEsHeWA0by","4fUU9WKxEgJXyrZJsUA2iP","1IhLUUzMxDDJ9pzfT95exy","6n7zeRIrGj8hTFxNWGb9k1","6goUTcMn0V30hWtKFIj6Kh","7DtdhIJlSSOaAFNk4JdXCb","6d2UQWWWZj3k4BE6WcN4IT","4LOgi2TAAoKU9ImfzRrCPO","2DjWsDGgL1xNbhnr7f6t5F","3Klfd4rsRO53fYpxmdQmYV","0BzhS74ByIVlyz8BedHaYi"])

    logger.info("All data added successfully.")
    session.close()
    # engine.dispose()
