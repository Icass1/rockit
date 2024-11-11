from spotdl.download.downloader import Downloader as SpotifyDownloader
from spotdl.types.song import Song
from spotdl.types.album import Album
from spotdl.types.playlist import Playlist
from spotdl.types.artist import Artist
from spotdl.types.saved import Saved


from utils import get_song_name, create_id
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
    def __init__(self, url, downloader):
        """Must be executed instantly"""
        self.url = url

        self.res: list[Song] = None
        self.list_info: Album | Playlist | Artist | Saved = None
        self.downloader = downloader

        threading.Thread(target=lambda : self.fetch_song()).start()

    def fetch_song(self):
        print(OKBLUE, "[LIST DOWNLOADER]", "Fetching list", ENDC)
        self.res, self.list_info = self.downloader.spotify.get_simple_songs(request=self.url)
        print(OKGREEN, "[LIST DOWNLOADER]", "Fetched list", self.list_info.name, ENDC)

        for song in self.res:
            if song.song_id in self.downloader.downloads_dict:
                print(WARNING, "Song already in downloads_dict", ENDC)
                continue
            self.downloader.downloads_dict[song.song_id] = {"messages": [{'id': song.song_id, 'completed': 0, 'total': 100, 'message': 'Processing'}]}
            self.downloader.downloads_ids_dict[get_song_name(song)] = song.song_id

        self.download_manager()

    def download_manager(self):

        threads: List[threading.Thread] = []

        for i in range(THREADS):
            print(f"[LIST DOWNLOADER MANAGER]: Started thread {i}")
            if i >= len(self.res):
                # print(f"[LIST DOWNLOADER MANAGER]: {i} is greater than {len(self.res)}")
                continue
            thread = threading.Thread(target=self.downloader.download_song, args=(self.res[i],))
            thread.start()
            threads.append(thread)
        
        index = i + 1

        while len(threads) != 0 or index < len(self.res):
            time.sleep(0.1)
            for thread in threads:
                if not thread.is_alive():
                    threads.remove(thread)
            for _ in range(THREADS - len(threads)):
                if index >= len(self.res):
                    # print(f"[LIST DOWNLOADER MANAGER]: {index} is greater than {len(self.res)}")
                    continue

                print(f"[LIST DOWNLOADER MANAGER]: Started thread {index}")
                thread = threading.Thread(target=self.downloader.download_song, args=(self.res[index],))
                thread.start()
                threads.append(thread)
                
                index += 1

        print(f"[LIST DOWNLOADER MANAGER]: Finished")

    def status(self):

        completed = 0


        # if not self.song or self.song.song_id not in self.downloader.downloads_dict:
        #     text = {'completed': 0, 'total': 100, 'message': 'Fetching'}
        #     yield f"data: {text}\n\n"

        #     while not self.song or self.song.song_id not in self.downloader.downloads_dict:
        #         time.sleep(0.5)

        # last_messages_len = 0
        # finish = False
        # while not finish:
        #     for k in self.downloader.downloads_dict[self.song.song_id]["messages"][last_messages_len:]:
        #         yield f"data: {k}\n\n"
        #         if k["completed"] == 100:
        #             finish = True
                
        #     last_messages_len = len(self.downloader.downloads_dict[self.song.song_id]["messages"])
        #     time.sleep(0.5)

        if not self.res:
            text = {'completed': 0, 'total': 100, 'message': 'Fetching'}
            yield f"data: {json.dumps(text)}\n\n"

            while not self.res:
                time.sleep(0.2)

        last_messages_len = {}

        for song in self.res:
            last_messages_len[song.song_id] = 0

        while completed < len(self.res):
            for song in self.res:
                for k in self.downloader.downloads_dict[song.song_id]["messages"][last_messages_len[song.song_id]:]:
                    yield f"data: {json.dumps(k)}\n\n"
                    if k["completed"] == 100:
                        completed += 1
                    
                last_messages_len[song.song_id] = len(self.downloader.downloads_dict[song.song_id]["messages"])
                time.sleep(0.2)

class SongDownloader:
    def __init__(self, url, downloader):
        """Must be executed instantly"""

        self.url = url
        self.song: Song = None

        self.downloader = downloader
        threading.Thread(target=lambda : self.fetch_song()).start()

    def fetch_song(self):
        # self.downloader.downloads_dict[self.download_id] = {"messages": [{'id': self.download_id, 'completed': 0, 'total': 100, 'message': 'Processing'}]}
        # self.song = Song.from_url(self.url)
        # self.downloader.downloads_ids_dict[get_song_name(self.song)] = self.download_id
        # self.download()

        self.song = Song.from_url(self.url)
        if self.song.song_id in self.downloader.downloads_dict:
            print(WARNING, "[SONG DOWNLOADER] Song already in downloads_dict", ENDC)
        else:
            self.downloader.downloads_dict[self.song.song_id] = {"messages": [{'id': self.song.song_id, 'completed': 0, 'total': 100, 'message': 'Processing'}]}
            self.downloader.downloads_ids_dict[get_song_name(self.song)] = self.song.song_id
            self.download()

    def download(self):
        self.downloader.download_song(self.song)

    def status(self):

        if not self.song or self.song.song_id not in self.downloader.downloads_dict:
            text = {'completed': 0, 'total': 100, 'message': 'Fetching'}
            yield f"data: {json.dumps(text)}\n\n"

            while not self.song or self.song.song_id not in self.downloader.downloads_dict:
                time.sleep(0.5)

        last_messages_len = 0
        finish = False
        while not finish:
            for k in self.downloader.downloads_dict[self.song.song_id]["messages"][last_messages_len:]:
                yield f"data: {json.dumps(k)}\n\n"
                if k["completed"] == 100:
                    finish = True
                
            last_messages_len = len(self.downloader.downloads_dict[self.song.song_id]["messages"])
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

        print(OKBLUE, url, ENDC)

        if "/track/" in url:

            return SongDownloader(url, self)

            # self.downloads_dict[download_id] = {"messages": [{'id': download_id, 'completed': 0, 'total': 100, 'message': 'Processing'}]}

            # song = Song.from_url(url)

            # self.downloads_dict[download_id]["song"] = song
            # self.downloads_ids_dict[get_song_name(song)] = download_id
    
            # self.download_song(song, download_id)
        else:
            return ListDownloader(url, self)

            res, list_info = self.spotify.get_simple_songs(request=url)

            self.downloads_dict["total"] = {"messages": []}
            self.downloads_ids_dict["Total"] = "total"

            self.list_downloads[download_id] = []

            for song in res:
                print(OKBLUE, song, ENDC)
                song_id = create_id()
                self.list_downloads[download_id].append(song_id)

                self.downloads_dict[song_id] = {"messages": [{'id': song_id, 'completed': 0, 'total': 100, 'message': 'Processing'}]}
                self.downloads_dict[song_id]["song"] = song
                self.downloads_ids_dict[get_song_name(song)] = song_id
                self.download_song(song, song_id)


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