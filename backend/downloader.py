from spotdl.download.downloader import Downloader as SpotifyDownloader
from spotdl.types.song import Song

from api_types import RawSpotifyApiTrack, RawSpotifyApiAlbum, AlbumItems, RawSpotifyApiPlaylist, PlaylistItems

from utils import get_song_name, sanitize_folder_name, get_output_file
from colors import *
from constants import DOWNLOADER_OPTIONS

import requests
from spotify import Spotify
import threading
from typing import Any, Dict, Optional, List, Tuple
import json
import time
from bs4 import BeautifulSoup
import os
import logging

# # Set up a handler specifically for spotdl
# spotdl_logger = logging.getLogger("spotdl")
# spotdl_logger.setLevel(logging.DEBUG)

# # Create a console handler for the spotdl logger
# console_handler = logging.StreamHandler()
# console_handler.setLevel(logging.DEBUG)

# # Optional: add formatting to the handler
# formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
# console_handler.setFormatter(formatter)

# # Add the handler to the spotdl logger
# spotdl_logger.addHandler(console_handler)

# # Remove other handlers to avoid duplicate logs
# spotdl_logger.propagate = False


import patches

THREADS = 16

class ListDownloader:
    def __init__(self, url, downloader: "Downloader"):
        """Must be executed instantly"""

        self.downloader = downloader

        self.url = self.downloader.spotify.parse_url(url)
        self.list: RawSpotifyApiAlbum | RawSpotifyApiPlaylist = None
        self.spotdl_songs: List[Song] = None
        self.raw_songs: List[AlbumItems] | List[PlaylistItems]= None

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

        if self.list.type == "album":
            threading.current_thread().name = f"Download manager - {self.list.name} - {self.list.artists[0].name}"
        else:
            threading.current_thread().name = f"Download manager - {self.list.name} - {self.list.owner.display_name}"

        threads: List[threading.Thread] = []

        for i in range(THREADS):
            print(f"[LIST DOWNLOADER MANAGER]: Started thread {i}")
            if i >= len(self.spotdl_songs):
                # print(f"[LIST DOWNLOADER MANAGER]: {i} is greater than {len(self.spotdl_songs)}")
                continue
            thread = threading.Thread(target=self.downloader.download_song, args=(self.spotdl_songs[i], self.raw_songs[i], self.list), name=f"List song downloader {self.spotdl_songs[i].name} - {self.spotdl_songs[i].artist}")
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
                    continue

                print(f"[LIST DOWNLOADER MANAGER]: Started thread {index}")
                thread = threading.Thread(target=self.downloader.download_song, name=f"List song downloader {self.spotdl_songs[index].name} - {self.spotdl_songs[i].artist}", args=(self.spotdl_songs[index], self.raw_songs[index], self.list))
                thread.start()
                threads.append(thread)
                
                index += 1
        print(f"[LIST DOWNLOADER MANAGER]: Finished")

        if self.list.type == "album":
            requests.post("http://localhost:4321/api/new-album", json={
                "id": self.list.id,
                "images": [image._json for image in self.list.images],
                "name": self.list.name,
                "release_date": self.list.release_date,
                "type": self.list.type,
                "artists": [{"name": artist.name, "id": artist.id} for artist in self.list.artists],
                "copyrights": [_copyright._json for _copyright in self.list.copyrights],
                "popularity": self.list.popularity,
                "genres": self.list.genres,
                "songs": [song.id for song in self.list.tracks.items],
                "disc_count": max([song.disc_number for song in self.list.tracks.items])
            })
        elif self.list.type == "playlist":
            requests.post("http://localhost:4321/api/new-playlist", json={
                "id": self.list.id,
                "images": [image._json for image in self.list.images],
                "name": self.list.name,
                "songs": [{"id": song.track.id, "added_at": song.added_at} for song in self.list.tracks.items],
                "description": self.list.description,
                "owner": self.list.owner.display_name,
                "followers": self.list.followers.total,
            })


    def status(self):
        songs_completed = 0
        list_completed = {}
        list_error = {}

        if not self.spotdl_songs:
            text = {'completed': 0, 'total': 100, 'message': 'Fetching'}
            yield f"data: {json.dumps(text)}\n\n"

            while not self.spotdl_songs:
                time.sleep(0.2)

        if self.list.type == "album":
            threading.current_thread().name = f"status - {self.list.name} - {self.list.artists[0].name}"
        else:
            threading.current_thread().name = f"status - {self.list.name} - {self.list.owner.display_name}"
            
        last_messages_len = {}

        for song in self.spotdl_songs:
            last_messages_len[song.song_id] = max(len(self.downloader.downloads_dict[song.song_id]["messages"]) - 1, 0)
            list_completed[song.song_id] = 0
            list_error[song.song_id] = 0

        while songs_completed < len(self.spotdl_songs):
            for song in self.raw_songs:
                song = song if self.list.type == "album" else song.track
                for k in self.downloader.downloads_dict[song.id]["messages"][last_messages_len[song.id]:]:
                    k["song"] = {}
                    k["song"]["name"] = song.name
                    k["song"]["artists"] = [artist._json for artist in song.artists]

                    k["list"] = {}
                    k["list"]["name"] = self.list.name
                    k["list"]["id"] = self.list.id
                    k["list"]["artists"] = [artist._json for artist in self.list.artists] if self.list.type == "album" else [self.list.owner.display_name]
                    k["list"]["images"] = [image._json for image in self.list.images]
                    
                    list_completed[song.id] = k["completed"]
                    list_error[song.id] = 100 if k["message"] == "Error" else 0

                    k["list_completed"] = sum(list_completed.values())/len(self.spotdl_songs)
                    k["list_error"] = sum(list_error.values())/len(self.spotdl_songs)
                    
                    yield f"data: {json.dumps(k)}\n\n"
                    if k["completed"] == 100 or k["message"] == "Error":
                        songs_completed += 1
                    
                last_messages_len[song.id] = len(self.downloader.downloads_dict[song.id]["messages"])
            time.sleep(0.2)

class SongDownloader:
    def __init__(self, url, downloader: "Downloader"):
        """Must be executed instantly"""

        self.url = url
        self.spotdl_song: Song = None
        self.raw_song: RawSpotifyApiTrack = None

        self.downloader = downloader
        self.thread = threading.Thread(target=lambda : self.fetch_song(), name=f"Song downloader {url}")
        self.thread.start()

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
        self.downloader.download_song(spotdl_song=self.spotdl_song, raw_song=self.raw_song)

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
        last_time_new_message = time.time()
        while not finish:

                       
            for k in self.downloader.downloads_dict[self.spotdl_song.song_id]["messages"][last_messages_len:]:
                last_time_new_message = time.time()
                k["song"] = {}
                k["song"]["name"] = self.raw_song.name
                k["song"]["artists"] = [artist._json for artist in self.raw_song.artists]
                k["song"]["album"] = {"images": [images._json for images in self.raw_song.album.images]}

                yield f"data: {json.dumps(k)}\n\n"
                if k["completed"] == 100:
                    finish = True
                
            last_messages_len = len(self.downloader.downloads_dict[self.spotdl_song.song_id]["messages"])
            time.sleep(0.5)

            # Timeout
            # if last_time_new_message + 10 < time.time():
            #     k["song"] = {}
            #     k["song"]["name"] = self.raw_song.name
            #     k["song"]["artists"] = [artist.json for artist in self.raw_song.artists]
            #     k["completed"] = 100
            #     k["message"] = "Timeout"

            #     print("Stopping", self.thread.name)
            #     self.thread.terminate()

            #     yield f"data: {json.dumps(k)}\n\n"
            #     finish = True

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

    def download_song(self, spotdl_song: Song, raw_song: RawSpotifyApiTrack | AlbumItems | PlaylistItems, raw_list: RawSpotifyApiAlbum | RawSpotifyApiPlaylist=None):

        print(OKBLUE, "[DOWNLOADER] Downloading", get_song_name(spotdl_song), ENDC)

        album_path = os.path.join("backend", "temp", sanitize_folder_name(spotdl_song.artist), sanitize_folder_name(spotdl_song.album_name))
        final_path = os.path.join(album_path, get_output_file(spotdl_song).replace("backend/temp/", ""))

        if os.path.exists(final_path):
            self.downloads_dict[spotdl_song.song_id]["messages"].append({"id": spotdl_song.song_id, "completed": 100, "total": 100, "message": "Skipping"})
            # self.downloads_dict[self.downloads_ids_dict[get_song_name(spotdl_song)]]["messages"].append({"id": spotdl_song.song_id, "completed": 100, "total": 100, "message": "Skipping"})
            path = final_path
        else:                 
            _, path = self.spotify_downloader.search_and_download(spotdl_song)

            if not os.path.exists(album_path):
                os.makedirs(album_path)
            if path == None:
                print(FAIL, "[DOWNLOADER] Error downloading", get_song_name(spotdl_song), ENDC)
            else:
                print(OKGREEN, "[DOWNLOADER] Downloaded", get_song_name(spotdl_song), ENDC)
                os.rename(path, final_path)
                path = final_path

        if raw_list == None:
            requests.post("http://localhost:4321/api/new-song", json={
                "name": spotdl_song.name,
                "artists": [{"name": artist.name, "id": artist.id} for artist in raw_song.artists],
                "genres": spotdl_song.genres,
                "disc_number": spotdl_song.disc_number,
                "album_name": spotdl_song.album_name,
                "album_artists": [{"name": artist.name, "id": artist.id} for artist in raw_song.album.artists],
                "album_type": spotdl_song.album_type,
                "duration": spotdl_song.duration,
                "year": spotdl_song.year,
                "date": spotdl_song.date,
                "track_number": spotdl_song.track_number,
                "tracks_count": spotdl_song.tracks_count,
                "song_id": spotdl_song.song_id,
                "publisher": spotdl_song.publisher,
                "path": str(path),
                "images": [image._json for image in raw_song.album.images],
                "copyright":  spotdl_song.copyright_text,
                "download_url": spotdl_song.download_url,
                "lyrics": spotdl_song.lyrics,
                "popularity": spotdl_song.popularity,
                "album_id": spotdl_song.album_id,
            })
        elif raw_list.type == "album":
            requests.post("http://localhost:4321/api/new-song", json={
                "name": spotdl_song.name,
                "artists": [{"name": artist.name, "id": artist.id} for artist in raw_song.artists],
                "genres": spotdl_song.genres,
                "disc_number": spotdl_song.disc_number,
                "album_name": spotdl_song.album_name,
                "album_artists": [{"name": artist.name, "id": artist.id} for artist in raw_list.artists] if raw_list else [{"name": artist.name, "id": artist.id} for artist in raw_song.album.artists],
                "album_type": spotdl_song.album_type,
                "duration": spotdl_song.duration,
                "year": spotdl_song.year,
                "date": spotdl_song.date,
                "track_number": spotdl_song.track_number,
                "tracks_count": spotdl_song.tracks_count,
                "song_id": spotdl_song.song_id,
                "publisher": spotdl_song.publisher,
                "path": str(path),
                "images": [image._json for image in raw_list.images] if raw_list else [image._json for image in raw_song.album.images],
                "copyright":  spotdl_song.copyright_text,
                "download_url": spotdl_song.download_url,
                "lyrics": spotdl_song.lyrics,
                "popularity": spotdl_song.popularity,
                "album_id": spotdl_song.album_id,
            })
        elif raw_list.type == "playlist":
            requests.post("http://localhost:4321/api/new-song", json={
                "name": spotdl_song.name,
                "artists": [{"name": artist.name, "id": artist.id} for artist in raw_song.track.artists],
                "genres": spotdl_song.genres,
                "disc_number": spotdl_song.disc_number,
                "album_name": spotdl_song.album_name,
                "album_artists": [{"name": artist.name, "id": artist.id} for artist in raw_song.track.album.artists],
                "album_type": spotdl_song.album_type,
                "duration": spotdl_song.duration,
                "year": spotdl_song.year,
                "date": spotdl_song.date,
                "track_number": spotdl_song.track_number,
                "tracks_count": spotdl_song.tracks_count,
                "song_id": spotdl_song.song_id,
                "publisher": spotdl_song.publisher,
                "path": str(path),
                "images": [image._json for image in raw_list.images] if raw_list else [image._json for image in raw_song.track.album.images],
                "copyright":  spotdl_song.copyright_text,
                "download_url": spotdl_song.download_url,
                "lyrics": spotdl_song.lyrics,
                "popularity": spotdl_song.popularity,
                "album_id": spotdl_song.album_id,
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