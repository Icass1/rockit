from spotdl.download.downloader import Downloader as SpotifyDownloader
from spotdl.types.song import Song
from spotdl.utils.matching import get_best_matches, order_results
from spotdl.types.result import Result
import spotdl.providers.audio.base

from api_types import RawSpotifyApiSong, RawSpotifyApiAlbum, AlbumItem

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








def get_best_result(self, results: Dict[Result, float]) -> Tuple[Result, float]:
    """
    Get the best match from the results
    using views and average match

    ### Arguments
    - results: A dictionary of results and their scores

    ### Returns
    - The best match URL and its score
    """

    best_results = get_best_matches(results, 8)

    # If we have only one result, return it
    if len(best_results) == 1:
        return best_results[0][0], best_results[0][1]

    # Initial best result based on the average match
    best_result = best_results[0]

    # If the best result has a score higher than 80%
    # and it's a isrc search, return it
    if best_result[1] > 80 and best_result[0].isrc_search:
        return best_result[0], best_result[1]

    # If we have more than one result,
    # return the one with the highest score
    # and most views
    if len(best_results) > 1:
        views: List[int] = []
        for best_result in best_results:
            if best_result[0].views:
                views.append(best_result[0].views)
            else:
                response = requests.get(best_result[0].url)
                soup = BeautifulSoup(response.content, 'html.parser')
                test = soup.find("meta", itemprop="interactionCount")

                _views = int(test["content"])
                views.append(_views)

        highest_views = max(views)
        lowest_views = min(views)

        if highest_views in (0, lowest_views):
            return best_result[0], best_result[1]

        weighted_results: List[Tuple[Result, float]] = []
        for index, best_result in enumerate(best_results):
            result_views = views[index]
            views_score = (
                (result_views - lowest_views) / (highest_views - lowest_views)
            ) * 15
            score = min(best_result[1] + views_score, 100)
            weighted_results.append((best_result[0], score))

        # Now we return the result with the highest score
        return max(weighted_results, key=lambda x: x[1])

    return best_result[0], best_result[1]



spotdl.providers.audio.base.AudioProvider.get_best_result = get_best_result


THREADS = 16

class ListDownloader:
    def __init__(self, url, downloader: "Downloader"):
        """Must be executed instantly"""

        self.downloader = downloader

        self.url = self.downloader.spotify.parse_url(url)
        self.list: RawSpotifyApiAlbum = None
        self.spotdl_songs: List[Song] = None
        self.raw_songs: List[AlbumItem] = None

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
                thread = threading.Thread(target=self.downloader.download_song, name=f"List song downloader {self.spotdl_songs[index].name} - {self.spotdl_songs[i].artist}", args=(self.spotdl_songs[index],))
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
                    k["list"]["id"] = self.list.id
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
        last_time_new_message = time.time()
        while not finish:

                       
            for k in self.downloader.downloads_dict[self.spotdl_song.song_id]["messages"][last_messages_len:]:
                last_time_new_message = time.time()
                k["song"] = {}
                k["song"]["name"] = self.raw_song.name
                k["song"]["artists"] = [artist.json for artist in self.raw_song.artists]

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

    def download_song(self, song: Song):

        print(OKBLUE, "[DOWNLOADER] Downloading", get_song_name(song), ENDC)

        album_path = os.path.join("backend", "temp", sanitize_folder_name(song.artist), sanitize_folder_name(song.album_name))
        final_path = os.path.join(album_path, get_output_file(song).replace("backend/temp/", ""))

        if os.path.exists():
            print(WARNING, "TODO - Handle song already downloaded")
        else: 
            _, path = self.spotify_downloader.search_and_download(song)

            if not os.path.exists(album_path):
                os.makedirs(album_path)
            if path == None:
                print(FAIL, "[DOWNLOADER] Error downloading", get_song_name(song), ENDC)
            else:
                print(OKGREEN, "[DOWNLOADER] Downloaded", get_song_name(song), ENDC)
                os.rename(path, final_path)
                path = final_path

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