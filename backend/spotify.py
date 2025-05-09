
from logging import Logger
from typing import Any, Dict, List

import os
import requests
import json
import base64
import re
import math

from spotdl.types.song import Song

from constants import IMAGES_PATH

from db.db import DB
from backend.db.commonTypes import ArtistDB
from db.image import ImageDB
from db.song import SongDBFull
from db.album import AlbumDBFull
from db.playlist import PlaylistDBFull

from backendUtils import create_id, create_playlist_collage, download_image,  get_utc_date, sanitize_folder_name, time_it
from logger import getLogger

from spotifyApiTypes.RawSpotifyApiAlbum import RawSpotifyApiAlbum
from spotifyApiTypes.RawSpotifyApiTrack import RawSpotifyApiTrack, TrackArtists
from spotifyApiTypes.RawSpotifyApiPlaylist import PlaylistArtists, PlaylistTracks, RawSpotifyApiPlaylist
from spotifyApiTypes.RawSpotifyApiArtist import RawSpotifyApiArtist
from spotifyApiTypes.RawSpotifyApiSearchResults import SpotifySearchResultsArtists


class Spotify:
    """Class to interact with Spotify API"""

    def __init__(self) -> None:

        self.logger: Logger = getLogger(
            name=__name__, class_name="Spotify")

        self.client_id = os.getenv('CLIENT_ID')
        self.client_secret = os.getenv('CLIENT_SECRET')

        self.token: str | None = None
        self.get_token()

        self.artists_cache: Dict[str, RawSpotifyApiArtist] = {}

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

        self.logger.warning(f"Spotify api call: {query_url}")

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
                f"Unable to load json. {result.content=}, {result.text=} {result.status_code=}")

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

                if not track_artist.id:
                    self.logger.error(f"track_artist.id is None {id}")
                    continue

                self.artists_cache[track_artist.id] = artist
                if artist.genres:
                    genres += artist.genres
                else:
                    self.logger.error(
                        f"artist {artist.id} doesn't have genres.")
        return genres

    def get_album(self, id: str, _call_from_song: bool = False):

        album_db: AlbumDBFull | None = self.db.get(
            "SELECT * FROM album WHERE id = ?", (id,))

        if album_db:

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
                "images": album_db.images,
            })

        else:

            self.logger.info("Album not found in database")

            raw_album = self.api_call(path=f"albums/{id}")

            return self._get_album_from_raw_album(raw_album)

    @time_it
    def get_playlist(self, id: str) -> RawSpotifyApiPlaylist | None:

        playlist_db: PlaylistDBFull | None = self.db.get(
            "SELECT * FROM playlist WHERE id = ?", (id,))

        if playlist_db:
            self.logger.info("Playlist found in database")
            return RawSpotifyApiPlaylist.from_dict({
                "id": playlist_db.id,
                "name": playlist_db.name,
                "owner": {"display_name": playlist_db.owner},
                "images": playlist_db.images,
                "tracks": {
                    "items": [{
                        "added_at": song.added_at,
                        "track":
                            {
                                "id": song.id
                            }
                    } for song in playlist_db.songs]
                }
            })

        else:
            self.logger.info("Playlist not found in database")

            playlist: RawSpotifyApiPlaylist = RawSpotifyApiPlaylist.from_dict(
                self.api_call(path=f"playlists/{id}"))

            if not playlist.tracks:
                self.logger.error(f"playlist.tracks is None {id}")
                return

            if not playlist.tracks.items:
                self.logger.error(f"playlist.tracks.items is None {id}")
                return

            if not playlist.owner:
                self.logger.error(
                    f"playlist.owner is None {id}")
                return

            if not playlist.owner.display_name:
                self.logger.error(
                    f"playlist.owner.display_name is None {id}")
                return

            if not playlist.name:
                self.logger.error(
                    f"playlist.name is None {id}")
                return

            if not playlist.images:
                self.logger.error(
                    f"playlist.images[0].url is None {id}")
                return

            if not playlist.images[0].url:
                self.logger.error(
                    f"playlist.images[0].url is None {id}")
                return

            next_tracks = playlist.tracks.next

            while next_tracks:
                raw_playlist_tracks: PlaylistTracks | None = PlaylistTracks.from_dict(self.api_call(
                    path=next_tracks.replace("https://api.spotify.com/v1/", "")))

                if not raw_playlist_tracks:
                    self.logger.error(
                        f"raw_playlist_tracks is None {id} {next_tracks}")
                    return

                if not raw_playlist_tracks.items:
                    self.logger.error(
                        f"raw_playlist_tracks.items is None {id} {next_tracks}")
                    return

                playlist.tracks.items.extend(raw_playlist_tracks.items)

                next_tracks = raw_playlist_tracks.next

            self.logger.info(len(playlist.tracks.items))

            image_path_dir = os.path.join("playlist", sanitize_folder_name(
                playlist.owner.display_name), sanitize_folder_name(playlist.name))
            image_path = os.path.join(image_path_dir, "image.png")
            image_path_1 = os.path.join(image_path_dir, "image_1.png")

            images_url: List[str] = []
            for k in playlist.tracks.items:
                if not k.track:
                    self.logger.error(
                        f"k.track is None {id}")
                    continue

                if not k.track.album:
                    self.logger.error(
                        f"k.track.album is None {id}")
                    continue

                if not k.track.album.images:
                    self.logger.error(
                        msg=f"k.track.album.images is None {id}")
                    continue

                if not k.track.album.images[0].url:
                    self.logger.error(
                        f"k.track.album.images[0].url is None {id}")
                    continue

                images_url.append(k.track.album.images[0].url)

            create_playlist_collage(output_path=os.path.join(
                IMAGES_PATH, image_path), urls=images_url)

            self.logger.debug(
                f"Saved collage to {os.path.join(IMAGES_PATH, image_path)}")

            download_image(playlist.images[0].url, os.path.join(
                IMAGES_PATH, image_path_1))

            image_db: ImageDB = self.db.get(
                "SELECT id FROM image WHERE path = ?", (image_path,))

            image_id: str

            if image_db:
                image_id = image_db.id
            else:
                image_id = create_id(20)
                self.logger.info(
                    f"Adding image {image_id} with path {image_path} to database")

                self.db.execute(
                    query="INSERT INTO image (id, path, url) VALUES(?, ?, ?)", parameters=(image_id, image_path, f"https://rockit.rockhosting.org/api/image/{image_id}"))

            self.db.execute("INSERT INTO playlist (id, images, image, name, description, owner, followers, songs, updatedAt, createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)", (
                playlist.id,
                json.dumps([image._json for image in playlist.images]),
                image_id,
                playlist.name,
                playlist.description,
                playlist.owner.display_name,
                0,
                json.dumps([{"id": song.track.id, "added_at": song.added_at}
                           for song in playlist.tracks.items if song.track and song.track.id and song.added_at]),
                get_utc_date(),
                get_utc_date()

            ))

            return playlist

    @time_it
    def get_songs(self, ids: List[str]) -> List[tuple[Song, RawSpotifyApiTrack]] | None:

        out: List[tuple[Song, RawSpotifyApiTrack]] = []

        missing_songs: List[str] = []
        missing_albums: List[str] = []

        for id in ids:
            song_db: SongDBFull | None = self.db.get(
                "SELECT * FROM song WHERE id = ?", (id,))

            if song_db:
                album_db = self.db.get(
                    "SELECT id FROM album WHERE id = ?", (song_db.albumId,))
                if not album_db:
                    missing_albums.append(song_db.albumId)
            else:
                self.logger.info(f"{id} not found in db")
                missing_songs.append(id)

        raw_songs = []

        self.logger.info(f"Missing songs: {len(missing_songs)}")

        for k in range(math.ceil(len(missing_songs)/100)):

            response = self.api_call(
                path=f"tracks", params={"ids": ",".join(missing_songs[k*100:(k + 1)*100])})

            if not response:
                self.logger.error("Response is None")
                continue

            raw_songs.extend(response["tracks"])

        for raw_song in raw_songs:
            album_id: str = raw_song["album"]["id"]

            album_db = self.db.get(
                "SELECT id FROM album WHERE id = ?", (album_id,))
            if not album_db:
                missing_albums.append(album_id)

        self.logger.info(f"Missing albums: {len(missing_albums)}")

        # Get missing albums 20 by 20
        for k in range(math.ceil(len(missing_albums)/20)):

            response = self.api_call(
                path=f"albums", params={"ids": ",".join(missing_albums[k*20:(k + 1)*20])})

            if not response:
                self.logger.error("Response is None")
                continue

            for raw_album in response["albums"]:
                self._get_album_from_raw_album(raw_album)

        for raw_song in raw_songs:

            song = self._get_song_from_raw_song(raw_song)

            if not song:
                self.logger.error("song is None")
                continue

            out.append(song)

        return out

    def get_song(self, id: str) -> tuple[Song, RawSpotifyApiTrack] | None:

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
                "external_ids": {"isrc": song_db.isrc},
                "external_urls": {"spotify": f"https://open.spotify.com/track/{song_db.id}"}
            })

            if not song_db.albumId:
                raise Exception("Album not in song", song_db)

            album: RawSpotifyApiAlbum | None = self.get_album(
                id=song_db.albumId, _call_from_song=True)

            if not album:
                self.logger.error("album is None")
                return

            genres = song_db.genres

            song_dict = {}

            if not song.artists:
                self.logger.error(
                    f"song.artists is None {id}")
                return

            if not album.artists:
                self.logger.error(
                    f"album.artists is None {id}")
                return

            if not album.artists[0].name:
                self.logger.error(
                    f"album.artists[0].name is None {id}")
                return

            if not album.copyrights:
                self.logger.error(
                    f"album.copyrights is None {id}")
                return

            if not album.copyrights[0].text:
                self.logger.error(
                    f"album.copyrights[0].text is None {id}")
                return

            if not album.tracks:
                self.logger.error(
                    f"album.tracks.items[-1].disc_number is None {id}")
                return

            if not album.tracks.items:
                self.logger.error(
                    f"album.tracks.items[-1].disc_number is None {id}")
                return

            if not album.tracks.items[-1].disc_number:
                self.logger.error(
                    f"album.tracks.items[-1].disc_number is None {id}")
                return

            if not song.duration_ms:
                self.logger.error(
                    f"song.duration_ms is None {id}")
                return

            if not album.release_date:
                self.logger.error(
                    f"album.release_date is None {id}")
                return

            if not song.external_ids:
                self.logger.error(
                    f"song.external_ids.isrc is None {id}")
                return

            if not song.external_ids.isrc:
                self.logger.error(
                    f"song.external_ids.isrc is None {id}")
                return

            if not song.external_urls:
                self.logger.error(
                    f"song.external_urls.spotify is None {id}")
                return

            if not song.external_urls.spotify:
                self.logger.error(
                    f"song.external_urls.spotify is None {id}")
                return

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
                max(album.images, key=lambda i: i.width *
                    i.height if i.width and i.height else 0)[
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

    def _get_album_from_raw_album(self, raw_album):

        album = RawSpotifyApiAlbum.from_dict(raw_album)

        if not album.images:
            self.logger.error(f"album.images is None {id}")
            return

        if not album.name:
            self.logger.error(f"album.name is None {id}")
            return

        if not album.artists:
            self.logger.error(f"album.artists is None {id}")
            return

        if not album.artists[0].name:
            self.logger.error(f"album.artists[0].name is None {id}")
            return

        if not album.copyrights:
            self.logger.error(f"album.copyrights is None {id}")
            return

        if not album.tracks:
            self.logger.error(f"album.tracks is None {id}")
            return

        if not album.tracks.items:
            self.logger.error(f"album.tracks.items is None {id}")
            return

        if len(album.images) > 1:
            image_url = max(album.images, key=lambda i: i.width *
                            i.height if i.width and i.height else 0)["url"] if album.images else None
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

        elif os.path.exists(os.path.join(IMAGES_PATH, image_path)):
            pass

        else:
            self.logger.error(
                f"Not able to download image. {image_url=} {image_path=} {IMAGES_PATH=}")

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

        album_db: AlbumDBFull | None = self.db.get(
            "SELECT id FROM album WHERE id = ?", (album.id,))

        if album_db:
            self.logger.warning(f"This should never happen {album.id}")
        else:
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
                    max([
                        track.disc_number if track.disc_number else 0 for track in album.tracks.items]),
                    get_utc_date()
                ))

        return album

    def _get_song_from_raw_song(self, raw_song):

        song: RawSpotifyApiTrack = RawSpotifyApiTrack.from_dict(raw_song)

        if not raw_song:
            self.logger.error("raw_song is None")
            return

        if "album" not in raw_song or "id" not in raw_song["album"]:
            raise Exception("Album not in song", raw_song)

        if not song.album:
            self.logger.error(
                f"song.album is None {raw_song=}")
            return

        if not song.album.id:
            self.logger.error(
                f"song.album.id is None {raw_song=}")
            return

        if not song.external_ids:
            self.logger.error(
                f"song.external_ids is None {raw_song=}")
            return

        if not song.external_ids.isrc:
            self.logger.error(
                f"song.external_ids.isrc is None {raw_song=}")
            return

        if not song.artists:
            self.logger.error(
                f"song.artists is None {raw_song=}")
            return

        album: RawSpotifyApiAlbum | None = self.get_album(
            id=song.album.id, _call_from_song=True)

        if not album:
            self.logger.error("Album is None")
            return

        if not album.artists:
            self.logger.error(
                f"album.artists is None {raw_song=}")
            return

        if not album.copyrights:
            self.logger.error(
                f"album.copyrights is None {raw_song=}")
            return

        if not album.tracks:
            self.logger.error(
                f"album.tracks is None {raw_song=}")
            return

        if not album.tracks.items:
            self.logger.error(
                f"album.tracks.items is None {raw_song=}")
            return

        if not song.duration_ms:
            self.logger.error(
                f"song.duration_ms is None {raw_song=}")
            return

        if not album.release_date:
            self.logger.error(
                f"album.release_date is None {raw_song=}")
            return

        if not album.images:
            self.logger.error(
                f"album.images is None {raw_song=}")
            return

        if not song.external_urls:
            self.logger.error(
                f"song.external_urls is None {raw_song=}")
            return

        if not song.external_urls.spotify:
            self.logger.error(
                f"song.external_urls.spotify is None {raw_song=}")
            return

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
            max(album.images, key=lambda i: i.width *
                i.height if i.width and i.height else 0)[
                "url"
            ]
            if album.images
            else None
        ),

        spotdl_song = Song.from_dict(song_dict)

        album_db: AlbumDBFull | None = self.db.get(
            "SELECT * FROM album WHERE id = ?", (song.album.id,))

        if not album_db:
            self.logger.error("Album doesn't exist in db")
            return

        self.db.execute("INSERT INTO song (id,name,artists,discNumber,albumName,albumArtist,albumType,albumId,isrc,duration,genres,date,trackNumber,publisher,images,image,copyright,popularity,dateAdded) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            song.id,
            song.name,
            json.dumps([{"name": artist.name, "id": artist.id}
                        for artist in song.artists]),
            song.disc_number,
            song.album.name,
            json.dumps([{"name": artist.name, "id": artist.id}
                        for artist in song.artists]),
            song.album.type,
            song.album.id,
            song.external_ids.isrc,
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

        return Song.from_dict(song_dict), song

    def parse_url(self, url: str) -> str:
        return re.sub(r"\/intl-\w+\/", "/", url).split("?")[0]


if __name__ == "__main__":

    # https://open.spotify.com/playlist/7h6r9ScqSjCHH3QozfBdIq?si=741f837fb7824e0a
    spotify = Spotify()
    spotify.get_playlist("7h6r9ScqSjCHH3QozfBdIq")
