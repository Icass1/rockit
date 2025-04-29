
import asyncio
from logging import Logger
from typing import Any, Dict, List, Optional

from fastapi import BackgroundTasks, Request
from fastapi.responses import StreamingResponse
import threading
import time
import uuid
import spotdl
from spotdl.download.downloader import Downloader as SpotdlDownloader
import os
import requests
import json
import base64
import re

from spotdl.types.song import Song


from backendUtils import get_song_name
from db.commonTypes import ArtistDB
from db.song import SongDBFull
from db.album import AlbumDBFull
from db.db import DB
from constants import DOWNLOADER_OPTIONS
from logger import getLogger

from spotifyApiTypes.RawSpotifyApiTrack import RawSpotifyApiTrack, TrackArtists
from spotifyApiTypes.RawSpotifyApiAlbum import RawSpotifyApiAlbum, AlbumItems
from spotifyApiTypes.RawSpotifyApiPlaylist import RawSpotifyApiPlaylist, PlaylistItems, PlaylistAlbum, PlaylistArtists, PlaylistTracks
from spotifyApiTypes.RawSpotifyApiArtist import RawSpotifyApiArtist
from spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults, SpotifySearchResultsArtists1, SpotifySearchResultsItems2
from ytMusicApiTypes.RawYTMusicApiPlaylist import RawYTMusicApiPlaylist
from ytMusicApiTypes.RawYTMusicApiAlbum import RawYTMusicApiAlbum
from ytMusicApiTypes.RawYTMusicApiSong import RawYTMusicApiSong
from rockItApiTypes.RawRockItApiAlbum import RawRockItApiAlbum


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
        self.logger.info("Spotify.get_token New token")

    def api_call(self, path: str, params: dict = {}) -> Any | None:

        parsed_params = ""

        for index, k in enumerate(list(params.items())):
            if index != 0:
                parsed_params += "&"
            parsed_params += k[0] + "=" + k[1]

        url = f"https://api.spotify.com/v1/{path}"
        headers = self.get_auth_header()

        query_url = url + \
            ("?" + parsed_params if len(parsed_params) > 0 else "")

        self.logger.debug(f"Spotify.api_call query_url {query_url}")

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
                f"Spotify.api_call unable to load json. content: {result.content}, text: {result.text}")

    def get_genres(self, artists: List[TrackArtists] | List[PlaylistArtists] | List[SpotifySearchResultsArtists1] | List[ArtistDB]):
        genres = []

        for track_artist in artists:
            if track_artist.id in self.artists_cache:
                self.logger.debug(
                    f"Spotify.get_genres Artist from cache {track_artist.id}")
                if self.artists_cache[track_artist.id].genres:
                    genres += self.artists_cache[track_artist.id].genres
                else:
                    self.logger.error(
                        f"Spotify.get_genres artist {track_artist.id} doesn't have genres.")
            else:
                self.logger.debug(
                    f"Spotify.get_genres Getting artist from API cache {track_artist.id}")
                raw_artist = self.api_call(path=f"artists/{track_artist.id}")
                artist = RawSpotifyApiArtist.from_dict(raw_artist)
                self.artists_cache[track_artist.id] = artist
                if artist.genres:
                    genres += artist.genres
                else:
                    self.logger.error(
                        f"Spotify.get_genres artist {artist.id} doesn't have genres.")
        return genres

    def get_album(self, id: str):
        self.logger.info(id)

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
                "tracks": {"items": [{"disc_number": album_db.discCount}]},
                "release_date": album_db.releaseDate,
                "total_tracks": len(album_db.songs),
                "label": "",
                "images": album_db.images
            })

        else:
            self.logger.info("Album not found in database")

            return RawSpotifyApiAlbum.from_dict(self.api_call(path=f"albums/{id}"))

    def get_song(self, id: str):
        self.logger.info(id)

        song_db: SongDBFull | None = self.db.get(
            "SELECT * FROM song WHERE id = ?", (id,))

        if song_db:
            self.logger.info("Song found in database")

            song = RawSpotifyApiTrack.from_dict(
                self.api_call(path=f"tracks/{id}"))

            if not song_db.albumId:
                raise Exception("Album not in song", song_db)

            album: RawSpotifyApiAlbum | None = self.get_album(
                song_db.albumId)

            if not album:
                self.logger.error("album is None")
                return

            genres = self.get_genres(artists=song_db.artists)

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
                f"Spotify.get_spotify_song Spotdl song: {spotdl_song}")
            self.logger.debug(f"Spotify.get_spotify_song Raw song: {song}")

            return Song.from_dict(song_dict), song

        else:
            self.logger.info("Song not found in database")

            raw_song = self.api_call(
                path=f"tracks/{id}")
            song = RawSpotifyApiTrack.from_dict(raw_song)

            if not raw_song:
                self.logger.error("raw_song is None")
                return

            if "album" not in raw_song or "id" not in raw_song["album"]:
                raise Exception("Album not in song", raw_song)

            album: RawSpotifyApiAlbum | None = self.get_album(song.album.id)

            if not album:
                self.logger.error("Album is None")
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
                max(album.images, key=lambda i: i.width * i.height)[
                    "url"
                ]
                if album.images
                else None
            ),

            spotdl_song = Song.from_dict(song_dict)

            self.logger.debug(
                f"Spotify.get_spotify_song Spotdl song: {spotdl_song}")
            self.logger.debug(f"Spotify.get_spotify_song Raw song: {song}")

            return Song.from_dict(song_dict), song

    def parse_url(self, url: str) -> str:
        return re.sub(r"\/intl-\w+\/", "/", url).split("?")[0]


class MessageHandlderReader:
    def __init__(self, handler: "MessageHandler") -> None:
        self.len_last_get_messages = 0
        self.handler: MessageHandler = handler

    async def get(self) -> Any:

        while self.len_last_get_messages >= len(self.handler._messages):
            await asyncio.sleep(0)

        out = self.handler._messages[self.len_last_get_messages]

        self.len_last_get_messages += 1

        return out


class MessageHandler:
    def __init__(self) -> None:
        self._messages: List[Any] = []
        self.logger: Logger = getLogger(
            name=__name__, class_name="MessageHandler")

        self._end = False

    def get_reader(self) -> MessageHandlderReader:
        return MessageHandlderReader(handler=self)

    def add(self, message: Any) -> None:
        self.logger.info(message)
        self._messages.append(message)

    def finish(self) -> None:
        self._end = True

    def get_finish(self) -> bool:
        self.logger.warn(
            "This function should be in MessageHandlderReader. and should return true when all messages have been read and MessageHandler.finish has been called.")
        return self._end


class YoutubeMusicDownloader:
    def __init__(self, downloader: "Downloader", download_id: str) -> None:
        self.download_id = download_id


class SpotifyDownloader:
    """Class to start spotify album, playlist or song downloads."""

    def __init__(self, downloader: "Downloader", download_id: str, url: str) -> None:
        self.logger: Logger = getLogger(
            name=__name__, class_name="SpotifyDownloader")

        self.downloader = downloader
        self.download_id = download_id
        self.url = url

        self.message_handler = MessageHandler()

        self.logger.info("")

        threading.Thread(target=self.fetch_and_add_to_queue).start()

    def fetch_and_add_to_queue(self) -> None:

        self.logger.info(f"Downloading {self.url}")

        out = self.downloader.spotify.get_song(
            self.url.replace("https://open.spotify.com/track/", ""))

        if not out:
            return

        spotdl_song, song = out

        self.downloader.queue.append(
            QueueElement(self.message_handler, spotdl_song))

        # Fetch spotify https://open.spotify.com/intl-es/track/5EvLXXAKicvIF3LegVMlJj?si=f22cd441145541a9

    def status(self, request: Request):
        self.logger.info(self.download_id)

        reader = self.message_handler.get_reader()

        async def event_generator():
            while True:
                if await request.is_disconnected():
                    break
                try:
                    if self.message_handler.get_finish():
                        break

                    message = await reader.get()

                    yield f"data: {message}\n\n"
                except asyncio.TimeoutError:
                    # Send keep-alive to prevent connection from closing
                    yield ": keep-alive\n\n"

            self.logger.info(f"Finished {self.download_id}")

        return StreamingResponse(event_generator(), media_type="text/event-stream")


class ProgressHandler:
    def __init__(self) -> None:
        self.downloads_ids_dict: Dict[str, str] = {}
        self.downloads_dict: Dict[str, MessageHandler] = {}
        self.logger: Logger = getLogger(
            name=__name__, class_name="ProgressHandler")

    def add_task(
        self,
        description: str,
        start: bool = True,
        total: Optional[float] = 100.0,
        completed: int = 0,
        visible: bool = True,
        **fields: Any,
    ):

        self.downloads_dict[self.downloads_ids_dict[description]].add(
            message={'id': self.downloads_ids_dict[description], 'completed': completed, 'total': total, 'message': fields['message']})

        return self.downloads_ids_dict[description]

    def update(
        self,
        task_id,
        *,
        total: Optional[float] = None,
        completed: Optional[float] = None,
        advance: Optional[float] = None,
        description: Optional[str] = None,
        visible: Optional[bool] = None,
        refresh: bool = False,
        **fields: Any,
    ):
        if completed:
            self.downloads_dict[task_id].add(
                message={'id': task_id, 'completed': completed, 'message': fields['message']})

    def start_task(self, task_id):
        self.logger.info(task_id)

    def remove_task(self, task_id):
        self.logger.info(task_id)


class QueueElement:
    def __init__(self, message_handler: MessageHandler, song: Song) -> None:
        self._song: Song = song
        self._message_handler: MessageHandler = message_handler

        self._done = False

    def get_song(self) -> Song:
        return self._song

    def get_message_handler(self) -> MessageHandler:
        return self._message_handler

    def done(self):
        self._done = True
        self._message_handler.finish()


class Downloader:
    def __init__(self) -> None:
        global init
        self.logger: Logger = getLogger(name=__name__, class_name="Downloader")
        self.logger.info(f"Init")

        self.progress_handler = ProgressHandler()

        self.spotdl_downloader = SpotdlDownloader(settings=DOWNLOADER_OPTIONS)
        self.spotdl_downloader.progress_handler.rich_progress_bar = self.progress_handler  # type: ignore

        self.spotify = Spotify()

        self.max_download_threads = 1
        self.queue: List[QueueElement] = []
        self.download_threads: List[threading.Thread] = []

        self.downloaders: Dict[str, SpotifyDownloader |
                               YoutubeMusicDownloader] = {}

    def download_url(self, url: str, background_tasks: BackgroundTasks) -> str:

        url = self.spotify.parse_url(url)

        download_id = str(uuid.uuid4())

        self.logger.info(f"{url=} {download_id=}")

        if "open.spotify.com" in url:
            self.downloaders[download_id] = SpotifyDownloader(
                downloader=self, download_id=download_id, url=url)
        elif "music.youtube.com" in url:
            self.downloaders[download_id] = YoutubeMusicDownloader(
                downloader=self, download_id=download_id)
        else:
            self.logger.error("Unknown provider")

        return download_id

    def download_status(self, request: Request, download_id):

        if not download_id in self.downloaders:
            return "Not found"

        return self.downloaders[download_id].status(request)

    def download_method(self, queue_element: QueueElement):

        self.progress_handler.downloads_ids_dict[get_song_name(
            queue_element.get_song())] = queue_element.get_song().song_id

        self.progress_handler.downloads_dict[queue_element.get_song(
        ).song_id] = queue_element.get_message_handler()

        _, path = self.spotdl_downloader.search_and_download(
            queue_element.get_song())

        queue_element.done()

        self.logger.warn("Should clean downloads_ids_dict and downloads_dict")

    async def download_manager(self):
        self.logger.info("Download manager")
        while True:
            await asyncio.sleep(3)
            self.logger.info(f"Loop - {self.queue}")

            for thread in self.download_threads:
                if not thread.is_alive():
                    self.logger.info("Thread has finished")
                    self.download_threads.remove(thread)

            if len(self.download_threads) < self.max_download_threads and len(self.queue) > 0:
                self.logger.info("Starting new thread")

                thread = threading.Thread(
                    target=self.download_method, args=(self.queue[0],))

                thread.start()
                self.download_threads.append(thread)

                self.queue.pop(0)
