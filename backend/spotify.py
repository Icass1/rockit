
from logging import Logger
from typing import Any, Dict, List

from spotdl.download.downloader import Downloader as SpotdlDownloader
import os
import requests
import json
import base64
import re

from spotdl.types.song import Song

from db.image import ImageDB
from db.commonTypes import ArtistDB
from db.song import SongDBFull
from db.album import AlbumDBFull
from db.db import DB
from backendUtils import create_id, download_image, get_song_name, get_utc_date, sanitize_folder_name
from logger import getLogger

from spotifyApiTypes.RawSpotifyApiAlbum import RawSpotifyApiAlbum
from spotifyApiTypes.RawSpotifyApiTrack import RawSpotifyApiTrack, TrackArtists
from spotifyApiTypes.RawSpotifyApiPlaylist import PlaylistArtists
from spotifyApiTypes.RawSpotifyApiArtist import RawSpotifyApiArtist
from spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsArtists


_IMAGES_PATH = os.getenv(key="IMAGES_PATH")
logger = getLogger(__name__)

if not _IMAGES_PATH:
    logger.critical("IMAGES_PATH is not set")
    exit()

IMAGES_PATH = _IMAGES_PATH


class Spotify:
    """Class to interact with Spotify API"""

    def __init__(self) -> None:

        self.logger: Logger = getLogger(
            name=__name__, class_name="Spotify")

        self.client_id = os.getenv('CLIENT_ID')
        self.client_secret = os.getenv('CLIENT_SECRET')
        pass

        self.token: str | None = None
        self.get_token()

        self.artists_cache = {}

        self.db = DB()

    def get_auth_header(self):
        if not self.token:
            self.logger.critical("token not set")
            return

        return {"Authorization": "Bearer " + self.token}

    def get_token(self):

        if not self.client_id:
            self.logger.critical("client_id not set")
            return

        if not self.client_secret:
            self.logger.critical("client_secret not set")
            return

        auth_string = self.client_id + ':' + self.client_secret
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

        self.token = json_response["access_token"]
        self.logger.info("New token")

    def api_call(self, path: str, params: Dict[str, str] = {}) -> Any | None:

        parsed_params = ""

        for index, k in enumerate(list(params.items())):
            if index != 0:
                parsed_params += "&"
            parsed_params += k[0] + "=" + k[1]

        url = f"https://api.spotify.com/v1/{path}"
        headers = self.get_auth_header()

        query_url = url + \
            ("?" + parsed_params if len(parsed_params) > 0 else "")

        self.logger.debug(f"query_url {query_url}")
        self.logger.warning(query_url)

        result = requests.get(query_url, headers=headers)
        if result.status_code == 401:
            self.logger.info("Token espired")
            self.get_token()
            headers = self.get_auth_header()
            result = requests.get(query_url, headers=headers)

        try:
            return json.loads(result.content)
        except:
            self.logger.critical(
                f"Unable to load json. content: {result.content}, text: {result.text}")

    def get_genres(self, artists: List[TrackArtists] | List[PlaylistArtists] | List[SpotifySearchResultsArtists] | List[ArtistDB]):
        genres = []

        for track_artist in artists:
            if track_artist.id in self.artists_cache:
                self.logger.debug(
                    f"Artist from cache {track_artist.id}")
                if self.artists_cache[track_artist.id].genres:
                    genres += self.artists_cache[track_artist.id].genres
                else:
                    self.logger.error(
                        f"artist {track_artist.id} doesn't have genres.")
            else:
                self.logger.debug(
                    f"Getting artist from API {track_artist.id}")
                raw_artist = self.api_call(path=f"artists/{track_artist.id}")
                artist = RawSpotifyApiArtist.from_dict(raw_artist)
                self.artists_cache[track_artist.id] = artist
                if artist.genres:
                    genres += artist.genres
                else:
                    self.logger.error(
                        f"artist {artist.id} doesn't have genres.")
        return genres

    def get_album(self, id: str, _call_from_song: bool = False):
        self.logger.info(id)

        album_db: AlbumDBFull | None = self.db.get(
            "SELECT * FROM album WHERE id = ?", (id,))

        if album_db:
            with open("delete.album_db", "w") as f:
                f.write(str(album_db))

            self.logger.info("Album found in database")
            return RawSpotifyApiAlbum.from_dict({
                "id": album_db.id,
                "name": album_db.name,
                "artists": album_db.artists,
                "type": album_db.type,
                "copyrights": album_db.copyrights,
                "tracks": {"items": [{"id": song_id, "disc_number": album_db.discCount} for song_id in album_db.songs]},
                "release_date": album_db.releaseDate,
                "total_tracks": len(album_db.songs),
                "label": "",
                "images": album_db.images
            })

        else:
            self.logger.info("Album not found in database")

            album = RawSpotifyApiAlbum.from_dict(
                self.api_call(path=f"albums/{id}"))

            if len(album.images) > 1:
                image_url = max(album.images, key=lambda i: i.width *
                                i.height)["url"] if album.images else None
            else:
                image_url = album.images[0].url

            image_path_dir = os.path.join("album", sanitize_folder_name(
                album.artists[0].name), sanitize_folder_name(album.name))
            image_path = os.path.join(image_path_dir, "image.png")

            if not os.path.exists(os.path.join(IMAGES_PATH, image_path_dir)):
                os.makedirs(os.path.join(
                    IMAGES_PATH, image_path_dir))

            if not os.path.exists(os.path.join(IMAGES_PATH, image_path)) and type(image_url) == str:
                self.logger.info(
                    f"Downloading image {image_url=} {image_path=}")
                download_image(url=image_url, path=os.path.join(
                    IMAGES_PATH, image_path))

            else:
                self.logger.error(
                    f"Not able to download image. {image_url=} {image_path=} {IMAGES_PATH=} {os.path.exists(os.path.join(IMAGES_PATH, image_path))=}")

            image_db: ImageDB = self.db.get(
                "SELECT * FROM image WHERE path = ?", (image_path,))
            image_id: None | str = None

            if image_db:
                self.logger.info("Image in database")
                image_id = image_db.id
            else:
                self.logger.info("Image not in database")
                self.logger.info(image_path)

                image_id = create_id(20)

                self.db.execute(
                    query="INSERT INTO image (id, path, url) VALUES(?, ?, ?)", parameters=(image_id, image_path, f"https://rockit.rockhosting.org/api/image/{image_id}"))

            self.db.execute(
                "INSERT INTO album (id,type,images,image,name,releaseDate,artists,copyrights,popularity,genres,songs,discCount,dateAdded) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                    album.id,
                    album.type,
                    json.dumps([image._json for image in album.images]),
                    image_id,
                    album.name,
                    album.release_date,
                    json.dumps([{"name": artist.name, "id": artist.id}
                                for artist in album.artists]),
                    json.dumps(
                        [_copyright._json for _copyright in album.copyrights]),
                    album.popularity,
                    json.dumps(album.genres),
                    json.dumps([track.id for track in album.tracks.items]),
                    max([track.disc_number for track in album.tracks.items]),
                    get_utc_date()
                ))

            return album

    def get_songs(self, ids: List[str]) -> List[tuple[Song, RawSpotifyApiTrack]] | None:
        self.logger.info(ids)

        out: List[tuple[Song, RawSpotifyApiTrack]] = []

        missing_songs: List[str] = []

        for id in ids:
            song_db: SongDBFull | None = self.db.get(
                "SELECT * FROM song WHERE id = ?", (id,))

            if song_db:
                self.logger.info(f"{id} found in db")

                song = self.get_song(id)
                if not song:
                    self.logger.error("song is None")
                    continue

                out.append(song)

            else:
                self.logger.info(f"{id} not found in db")
                missing_songs.append(id)

        self.logger.info(missing_songs)

        if len(missing_songs) > 0:

            raw_songs = self.api_call(
                path=f"tracks", params={"ids": ",".join(missing_songs)})

            if not raw_songs:
                self.logger.error("songs is None")
                return

            for raw_song in raw_songs["tracks"]:

                song = self._get_song_from_raw_song(raw_song)

                if not song:
                    self.logger.error("song is None")
                    continue

                out.append(song)

        return out

    def get_song(self, id: str) -> tuple[Song, RawSpotifyApiTrack] | None:
        self.logger.info(id)

        song_db: SongDBFull | None = self.db.get(
            "SELECT * FROM song WHERE id = ?", (id,))

        if song_db:
            self.logger.info("Song found in database")

            song = RawSpotifyApiTrack.from_dict({
                "name": song_db.name,
                "id": song_db.id,
                "artists": [{"name": artist.name, "id": artist.id} for artist in song_db.artists],
                "track_number": song_db.trackNumber,
                "duration_ms": song_db.duration * 1000,
                "popularity": song_db.popularity,
                "disc_number": song_db.discNumber,
                "external_ids": {"isrc": None},
                "external_urls": {"spotify": f"https://open.spotify.com/track/{song_db.id}"}
            })

            if not song_db.albumId:
                raise Exception("Album not in song", song_db)

            album: RawSpotifyApiAlbum | None = self.get_album(
                id=song_db.albumId, _call_from_song=True)

            if not album:
                self.logger.error("album is None")
                return

            self.logger.info(song_db.artists)

            genres = song_db.genres

            song_dict = {}

            song_dict["name"] = song.name
            song_dict["artists"] = [artist.name for artist in song.artists]
            song_dict["artist"] = song.artists[0].name
            song_dict["artist_id"] = song.artists[0].id
            song_dict["album_id"] = album.id
            song_dict["album_name"] = album.name
            song_dict["album_artist"] = album.artists[0].name
            song_dict["album_type"] = album.type
            song_dict["copyright_text"] = album.copyrights[0].text
            song_dict["genres"] = genres
            song_dict["disc_number"] = song.disc_number
            song_dict["disc_count"] = album.tracks.items[-1].disc_number
            song_dict["duration"] = song.duration_ms/1000
            song_dict["year"] = int(album.release_date[:4])
            song_dict["date"] = album.release_date
            song_dict["track_number"] = song.track_number
            song_dict["tracks_count"] = album.total_tracks
            song_dict["isrc"] = song.external_ids.isrc
            song_dict["song_id"] = song.id
            song_dict["explicit"] = song.explicit
            song_dict["publisher"] = album.label
            song_dict["url"] = song.external_urls.spotify
            song_dict["popularity"] = song.popularity
            song_dict["cover_url"] = (
                max(album.images, key=lambda i: i.width * i.height)[
                    "url"
                ]
                if album.images
                else None
            ),

            spotdl_song = Song.from_dict(song_dict)

            self.logger.debug(
                f"Spotdl song: {spotdl_song}")
            self.logger.debug(f"Raw song: {song}")

            return Song.from_dict(song_dict), song

        else:
            self.logger.info("Song not found in database")

            raw_song = self.api_call(
                path=f"tracks/{id}")

            return self._get_song_from_raw_song(raw_song=raw_song)

    def _get_song_from_raw_song(self, raw_song):

        song = RawSpotifyApiTrack.from_dict(raw_song)

        if not raw_song:
            self.logger.error("raw_song is None")
            return

        if "album" not in raw_song or "id" not in raw_song["album"]:
            raise Exception("Album not in song", raw_song)

        album: RawSpotifyApiAlbum | None = self.get_album(
            id=song.album.id, _call_from_song=True)

        with open("delete.album", "w") as f:
            f.write(str(album))

        if not album:
            self.logger.error("Album is None")
            return

        self.logger.info(song.external_ids.isrc)

        genres = self.get_genres(artists=song.artists)

        song_dict = {}

        song_dict["name"] = song.name
        song_dict["artists"] = [artist.name for artist in song.artists]
        song_dict["artist"] = song.artists[0].name
        song_dict["artist_id"] = song.artists[0].id
        song_dict["album_id"] = album.id
        song_dict["album_name"] = album.name
        song_dict["album_artist"] = album.artists[0].name
        song_dict["album_type"] = album.type
        song_dict["copyright_text"] = album.copyrights[0].text
        song_dict["genres"] = genres
        song_dict["disc_number"] = song.disc_number
        song_dict["disc_count"] = album.tracks.items[-1].disc_number
        song_dict["duration"] = song.duration_ms/1000
        song_dict["year"] = int(album.release_date[:4])
        song_dict["date"] = album.release_date
        song_dict["track_number"] = song.track_number
        song_dict["tracks_count"] = album.total_tracks
        song_dict["isrc"] = song.external_ids.isrc
        song_dict["song_id"] = song.id
        song_dict["explicit"] = song.explicit
        song_dict["publisher"] = album.label
        song_dict["url"] = song.external_urls.spotify
        song_dict["popularity"] = song.popularity
        song_dict["cover_url"] = (
            max(album.images, key=lambda i: i.width * i.height)[
                "url"
            ]
            if album.images
            else None
        ),

        spotdl_song = Song.from_dict(song_dict)

        self.logger.debug(
            f"Spotdl song: {spotdl_song}")
        self.logger.debug(f"Raw song: {song}")

        album_db: AlbumDBFull | None = self.db.get(
            "SELECT * FROM album WHERE id = ?", (song.album.id,))

        if not album_db:
            self.logger.error("Album doesn't exist in db")
            return

        self.logger.info("Inserting")

        self.db.execute("INSERT INTO song (id,name,artists,discNumber,albumName,albumArtist,albumType,albumId,duration,genres,date,trackNumber,publisher,images,image,copyright,popularity,dateAdded) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            song.id,
            song.name,
            json.dumps([{"name": artist.name, "id": artist.id}
                        for artist in song.artists]),
            song.disc_number,
            song.album.name,
            json.dumps([{"name": artist.name, "id": artist.id}
                        for artist in song.album.artists]),
            song.album.type,
            song.album.id,
            round(song.duration_ms/1000, 2),
            json.dumps(genres),
            song.album.release_date,
            song.track_number,
            spotdl_song.publisher,
            json.dumps([image._json for image in album.images]),
            album_db.image,
            spotdl_song.copyright_text,
            song.popularity,
            get_utc_date()
        ))

        self.logger.info("Inserted")

        return Song.from_dict(song_dict), song

    def parse_url(self, url: str) -> str:
        return re.sub(r"\/intl-\w+\/", "/", url).split("?")[0]
