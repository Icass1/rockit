from spotdl.download.downloader import Downloader as SpotifyDownloader
from spotdl.types.song import Song

from api_types import RawSpotifyApiSong, RawSpotifyApiAlbum, AlbumItem

from utils import get_song_name
from colors import *
from constants import DOWNLOADER_OPTIONS

import requests
from spotify import Spotify
import threading
from typing import Any, Dict, Optional, List
import time
import json

THREADS = 4

class ListDownloader:
    def __init__(self, url, downloader: "Downloader"):
        """Must be executed instantly"""

        self.downloader = downloader

        self.url = self.downloader.spotify.parse_url(url)
        self.list: RawSpotifyApiAlbum
        self.spotdl_songs: List[Song]
        self.raw_songs: List[AlbumItem]

        if "/album/" in self.url:
            self.type = "album"
        elif "/playlist/" in self.url:
            self.type = "playlist"
        else: raise Exception("Invalid URL", url)

        threading.Thread(target=lambda : self.fetch_list(), name=f"List downloader {url}").start()

    def fetch_list(self):
        print(OKBLUE, "[LIST DOWNLOADER]", "Fetching list", ENDC)
        self.list, self.spotdl_songs, self.raw_songs = self.downloader.spotify.spotdl_songs_from_url(url=self.url)
        print(OKGREEN, "[LIST DOWNLOADER]", "Fetched list", self.list.name, ENDC)

        for song in self.spotdl_songs:
            if song.song_id in self.downloader.downloads_dict:
                print(WARNING, "Song already in downloads_dict", ENDC)
                continue
            self.downloader.downloads_dict[song.song_id] = {"messages": [{'id': song.song_id, 'completed': 0, 'total': 100, 'message': 'Processing'}]}
            self.downloader.downloads_ids_dict[get_song_name(song)] = song.song_id

        self.download_manager()

    def download_manager(self):

        threading.current_thread().name = f"Download manager - {self.list.name} - {self.list.artists[0].name}"


        threads: List[threading.Thread] = []

        for i in range(THREADS):
            print(f"[LIST DOWNLOADER MANAGER]: Started thread {i}")
            if i >= len(self.spotdl_songs):
                # print(f"[LIST DOWNLOADER MANAGER]: {i} is greater than {len(self.spotdl_songs)}")
                continue
            thread = threading.Thread(target=self.downloader.download_song, args=(self.spotdl_songs[i],), name=f"List song downloader {self.spotdl_songs[i].name} - {self.spotdl_songs[i].artist}")
            thread.start()
            threads.append(thread)
        
        index = i + 1

        while len(threads) != 0 or index < len(self.spotdl_songs):
            time.sleep(0.1)
            for thread in threads:
                if not thread.is_alive():
                    threads.remove(thread)
            for _ in range(THREADS - len(threads)):
                if index >= len(self.spotdl_songs):
                    # print(f"[LIST DOWNLOADER MANAGER]: {index} is greater than {len(self.spotdl_songs)}")
                    continue

                print(f"[LIST DOWNLOADER MANAGER]: Started thread {index}")
                thread = threading.Thread(target=self.downloader.download_song, name=f"List song downloader {self.spotdl_songs[i].name} - {self.spotdl_songs[i].artist}", args=(self.spotdl_songs[index],))
                thread.start()
                threads.append(thread)
                
                index += 1

        print(f"[LIST DOWNLOADER MANAGER]: Finished")

    def status(self):


        songs_completed = 0
        list_completed = {}

        if not self.spotdl_songs:
            text = {'completed': 0, 'total': 100, 'message': 'Fetching'}
            yield f"data: {json.dumps(text)}\n\n"

            while not self.spotdl_songs:
                time.sleep(0.2)

        threading.current_thread().name = f"status - {self.list.name} - {self.list.artists[0].name}"

        last_messages_len = {}

        for song in self.spotdl_songs:
            last_messages_len[song.song_id] = 0
            list_completed[song.song_id] = 0

        while songs_completed < len(self.spotdl_songs):
            for song in self.raw_songs:
                
                for k in self.downloader.downloads_dict[song.id]["messages"][last_messages_len[song.id]:]:
                    # k["song"] = song.json # Too much data
                    k["song"] = {}
                    k["song"]["name"] = song.name
                    k["song"]["artists"] = [artist.json for artist in song.artists]


                    # k["list"] = self.list.json # Too much data
                    k["list"] = {}
                    k["list"]["name"] = self.list.name
                    k["list"]["artists"] = [artist.json for artist in self.list.artists]
                    k["list"]["images"] = [image.json for image in self.list.images]

                    
                    list_completed[song.id] = k["completed"]
                    k["list_completed"] = sum(list_completed.values())/len(self.spotdl_songs)
                    
                    yield f"data: {json.dumps(k)}\n\n"
                    if k["completed"] == 100:
                        songs_completed += 1
                    
                last_messages_len[song.id] = len(self.downloader.downloads_dict[song.id]["messages"])
                time.sleep(0.2)

class SongDownloader:
    def __init__(self, url, downloader: "Downloader"):
        """Must be executed instantly"""

        self.url = url
        self.spotdl_song: Song = None
        self.raw_song: RawSpotifyApiSong = None

        self.downloader = downloader
        threading.Thread(target=lambda : self.fetch_song(), name=f"Song downloader {url}").start()

    def fetch_song(self):
        self.spotdl_song, self.raw_song = self.downloader.spotify.spotdl_song_from_url(self.url)
        threading.current_thread().name = f"Song downloader - {self.raw_song.name} - {self.raw_song.artists[0].name}"

        if self.spotdl_song.song_id in self.downloader.downloads_dict:
            print(WARNING, "[SONG DOWNLOADER] Song already in downloads_dict", ENDC)
        else:
            self.downloader.downloads_dict[self.spotdl_song.song_id] = {"messages": [{'id': self.spotdl_song.song_id, 'completed': 0, 'total': 100, 'message': 'Processing'}]}
            self.downloader.downloads_ids_dict[get_song_name(self.spotdl_song)] = self.spotdl_song.song_id
            self.download()

    def download(self):
        self.downloader.download_song(self.spotdl_song)

    def status(self):

        threading.current_thread().name = f"Test"

        if not self.spotdl_song or self.spotdl_song.song_id not in self.downloader.downloads_dict:
            text = {'completed': 0, 'total': 100, 'message': 'Fetching'}
            yield f"data: {json.dumps(text)}\n\n"

            while not self.spotdl_song or self.spotdl_song.song_id not in self.downloader.downloads_dict:
                time.sleep(0.5)
                
        threading.current_thread().name = f"Status - {self.spotdl_song.name} - {self.spotdl_song.artist}"

        last_messages_len = 0
        finish = False
        while not finish:
            for k in self.downloader.downloads_dict[self.spotdl_song.song_id]["messages"][last_messages_len:]:
                # k["song"] = self.raw_song.json
                k["song"] = {}
                k["song"]["name"] = self.raw_song.name
                k["song"]["artists"] = [artist.json for artist in self.raw_song.artists]

                yield f"data: {json.dumps(k)}\n\n"
                if k["completed"] == 100:
                    finish = True
                
            last_messages_len = len(self.downloader.downloads_dict[self.spotdl_song.song_id]["messages"])
            time.sleep(0.5)

class Downloader:
    def __init__(self, spotify: Spotify) -> None:

        self.spotify_downloader = SpotifyDownloader(DOWNLOADER_OPTIONS)
        self.spotify_downloader.progress_handler.rich_progress_bar = self

        self.downloads_ids_dict: Dict = {}
        self.downloads_dict = {}
        self.spotify = spotify

        self.list_downloads = {}

    def download_url(self, url):

        if "/track/" in url:
            return SongDownloader(url, self)

        elif "/playlist/" in url or "/album/" in url:
            return ListDownloader(url, self)

    def download_song(self, song: Song):

        print(OKBLUE, "[DOWNLOADER] Downloading", get_song_name(song), ENDC)
        _, path = self.spotify_downloader.search_and_download(song)

        if path == None:
            print(FAIL, "[DOWNLOADER] Error downloading", get_song_name(song), ENDC)
        else:
            print(OKGREEN, "[DOWNLOADER] Downloaded", get_song_name(song), ENDC)

        requests.post("http://localhost:4321/api/new-song", json={
            "name": song.name,
            "artists": song.artists,
            "artist": song.artist,
            "genres": song.genres,
            "disc_number": song.disc_number,
            "disc_count": song.disc_count,
            "album_name": song.album_name,
            "album_artist": song.album_artist,
            "album_type": song.album_type,
            "duration": song.duration,
            "year": song.year,
            "date": song.date,
            "track_number": song.track_number,
            "tracks_count": song.tracks_count,
            "song_id": song.song_id,
            "explicit": song.explicit,
            "publisher": song.publisher,
            "url": song.url,
            "isrc": song.isrc,
            "path": str(path),
            "cover_url": song.cover_url,
            "copyright_text": song.copyright_text,
            "download_url": song.download_url,
            "lyrics": song.lyrics,
            "popularity": song.popularity,
            "album_id": song.album_id,
            "artist_id": song.artist_id,
        })

    def add_task(
        self,
        description: str,
        start: bool = True,
        total: Optional[float] = 100.0,
        completed: int = 0,
        visible: bool = True,
        **fields: Any,
    ):
        self.downloads_dict[self.downloads_ids_dict[description]]["messages"].append({'id': self.downloads_ids_dict[description], 'completed': completed, 'total': total, 'message': fields['message']})
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
        # print(f"update {task_id=}, {total=}, {completed=}, {advance=}, {description=}, {visible=}, {refresh=}, {fields=}")
        # print(f"update {task_id=}, {total=}, {completed=}")
        self.downloads_dict[task_id]["messages"].append({'id': task_id, 'completed': int(completed), 'message': fields['message']})

    def start_task(self, task_id):
        pass

    def remove_task(self, task_id):
        pass