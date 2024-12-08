from spotdl.download.downloader import Downloader as SpotifyDownloader
from spotdl.types.song import Song

from apiTypes.RawSpotifyApiTrack import RawSpotifyApiTrack
from apiTypes.RawSpotifyApiAlbum import RawSpotifyApiAlbum, AlbumItems
from apiTypes.RawSpotifyApiPlaylist import RawSpotifyApiPlaylist, PlaylistItems
from apiTypes.RawYTMusicApiAlbum import RawYTMusicApiAlbum
from apiTypes.RawYTMusicApiPlaylist import RawYTMusicApiPlaylist

from backendUtils import get_song_name, sanitize_folder_name, get_output_file, download_image, create_playlist_collage
from constants import DOWNLOADER_OPTIONS


import requests
from spotify import Spotify
import threading
from typing import Any, Dict, Optional, List
import json
import time
import os
from logger import getLogger
import shutil

logger = getLogger(__name__)

import patches

THREADS = 16

class ListDownloader:
    def __init__(self, url, downloader: "Downloader"):
        """Must be executed instantly"""

        self.downloader = downloader

        self.url = url
        self.list: RawSpotifyApiAlbum | RawSpotifyApiPlaylist | RawYTMusicApiAlbum | RawYTMusicApiPlaylist = None
        self.spotdl_songs: List[Song] = None
        self.raw_songs: List[AlbumItems] | List[PlaylistItems]= None

        threading.Thread(target=lambda : self.fetch_list(), name=f"List downloader {url}").start()

    def fetch_list(self):
        logger.info("ListDownloader.fetch_list Fetching list")
        self.list, self.spotdl_songs, self.raw_songs = self.downloader.spotify.spotdl_songs_from_url(url=self.url)
        logger.info(f"ListDownloader.fetch_list Fetched list {self.list.name}")

        for song in self.spotdl_songs:
            if song.song_id in self.downloader.downloads_dict:
                logger.warning(f"ListDownloader.fetch_list Song already in downloads_dict {song.song_id}")
                continue
            self.downloader.downloads_dict[song.song_id] = {"messages": [{'id': song.song_id, 'completed': 0, 'total': 100, 'message': 'Processing'}]}
            self.downloader.downloads_ids_dict[get_song_name(song)] = song.song_id

        self.download_manager()

    def download_manager(self):

        if self.list.type == "album":
            threading.current_thread().name = f"Download manager - {self.list.name} - {self.list.artists[0].name}"
        elif self.list.type == "playlist":
            threading.current_thread().name = f"Download manager - {self.list.name} - {self.list.owner.display_name}"

        threads: List[threading.Thread] = []

        for i in range(THREADS):
            if i >= len(self.spotdl_songs):
                continue
            logger.info(f"ListDownloader.download_manager Started thread {i}")
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

                logger.info(f"ListDownloader.download_manager Started thread {index}")
                thread = threading.Thread(target=self.downloader.download_song, name=f"List song downloader {self.spotdl_songs[index].name} - {self.spotdl_songs[i].artist}", args=(self.spotdl_songs[index], self.raw_songs[index], self.list))
                thread.start()
                threads.append(thread)
                
                index += 1



            

            



        if self.list.type == "album":
            pass
            # if len(self.list.images) > 1:

            #     image_url = max(self.list.images, key=lambda i: i.width * i.height)["url"] if self.list.images else None
            # else:
            #     image_url = self.list.images[0].url

            # image_path_dir = os.path.join("album", sanitize_folder_name(self.list.artists[0].name), sanitize_folder_name(self.list.name))
            # image_path = os.path.join(image_path_dir, "image.png")

            # if not os.path.exists(os.path.join(os.getenv("IMAGES_PATH"), image_path_dir)):
            #     os.makedirs(os.path.join(os.getenv("IMAGES_PATH"), image_path_dir))
            # if not os.path.exists(os.path.join(os.getenv("IMAGES_PATH"), image_path)):
            #     self.downloader.download_image(url=image_url, path=os.path.join(os.getenv("IMAGES_PATH"), image_path))

            # requests.post(f"{os.getenv('FRONTEND_URL')}/api/new-album", json={
            #     "id": self.list.id,
            #     "images": [image._json for image in self.list.images],
            #     "image": image_path,
            #     "name": self.list.name,
            #     "release_date": self.list.release_date,
            #     "type": self.list.type,
            #     "artists": [{"name": artist.name, "id": artist.id} for artist in self.list.artists],
            #     "copyrights": [_copyright._json for _copyright in self.list.copyrights],
            #     "popularity": self.list.popularity,
            #     "genres": self.list.genres,
            #     "songs": [song.id for song in self.list.tracks.items],
            #     "disc_count": max([song.disc_number for song in self.list.tracks.items])
            # })
        elif self.list.type == "playlist":
            
            if len(self.list.images) > 1:
                image_url = max(self.list.images, key=lambda i: i.width * i.height)["url"] if self.list.images else None
            else:
                image_url = self.list.images[0].url

            image_path_dir = os.path.join("playlist", sanitize_folder_name(self.list.owner.display_name), sanitize_folder_name(self.list.name))
            image_path = os.path.join(image_path_dir, "image.png")
            if not os.path.exists(os.path.join(os.getenv("IMAGES_PATH"), image_path_dir)):
                os.makedirs(os.path.join(os.getenv("IMAGES_PATH"), image_path_dir))
            # if not os.path.exists(os.path.join(os.getenv("IMAGES_PATH"), image_path)):
                
            images_url = []
            for k in self.raw_songs:
                images_url.append(k.track.album.images[0].url)
            create_playlist_collage(output_path=os.path.join(os.getenv("IMAGES_PATH"), image_path), urls=list(set(images_url)))
            print("saved image to", os.path.join(os.getenv("IMAGES_PATH"), image_path))

            requests.post(f"{os.getenv('FRONTEND_URL')}/api/new-playlist", json={
                "id": self.list.id,
                "images": [image._json for image in self.list.images],
                "image": image_path,
                "name": self.list.name,
                "songs": [{"id": song.track.id, "added_at": song.added_at} for song in self.list.tracks.items],
                "description": self.list.description,
                "owner": self.list.owner.display_name,
                "followers": self.list.followers.total,
            })

        logger.info(f"ListDownloader.download_manager Finished")

    def status(self):
        
        songs_completed = 0
        list_completed = {}
        list_error = {}

        if not self.spotdl_songs:
            text = {'completed': 0, 'total': 100, 'message': 'Fetching'}
            logger.debug(f"ListDownloader.status data: {json.dumps(text)}")
            yield f"data: {json.dumps(text)}\n\n"

            while not self.spotdl_songs:
                time.sleep(0.2)



        if self.list.type == "album":
            threading.current_thread().name = f"status - {self.list.name} - {self.list.artists[0].name}"
        elif self.list.type == "playlist":
            threading.current_thread().name = f"status - {self.list.name} - {self.list.owner.display_name}"
        else:
            logger.critical("List type not known")
            return "List type not known"
            
        last_messages_len = {}

        text = {"list": {"type": self.list.type, "id": self.list.id, "name": self.list.name, "artists": [artist._json for artist in self.list.artists] if self.list.type == "album" else [self.list.owner.display_name], "images": [image._json for image in self.list.images]}}
        yield f"data: {json.dumps(text)}\n\n"

        for song in self.raw_songs:
            song = song if self.list.type == "album" else song.track
            if song.id not in self.downloader.downloads_dict:
                logger.error(f"ListDownloader.status song.id: {song.id} is not in self.downloader.downloads_dict: {self.downloader.downloads_dict}")

            while song.id not in self.downloader.downloads_dict:
                time.sleep(0.1)

            if song.id not in self.downloader.downloads_dict:
                logger.critical(f"ListDownloader.status song.id: {song.id} is not in self.downloader.downloads_dict: {self.downloader.downloads_dict}")

            text = {"song": {"id": song.id, "name": song.name, "artists":  [artist._json for artist in song.artists]}}
            yield f"data: {json.dumps(text)}\n\n"

            last_messages_len[song.id] = max(len(self.downloader.downloads_dict[song.id]["messages"]) - 1, 0)
            list_completed[song.id] = 0
            list_error[song.id] = 0

        while songs_completed < len(self.spotdl_songs):
            for song in self.raw_songs:
                song = song if self.list.type == "album" else song.track
                for k in self.downloader.downloads_dict[song.id]["messages"][last_messages_len[song.id]:]:
                    list_completed[song.id] = k["completed"]
                    list_error[song.id] = 100 if k["message"] == "Error" else 0

                    k["list_completed"] = sum(list_completed.values())/len(self.spotdl_songs)
                    k["list_error"] = sum(list_error.values())/len(self.spotdl_songs)
                    k["list_id"] = self.list.id

                    logger.debug(f"ListDownloader.status data: {json.dumps(k)}")
                    yield f"data: {json.dumps(k)}\n\n"
                    if k["completed"] == 100 or k["message"] == "Error":
                        songs_completed += 1
                    
                last_messages_len[song.id] = len(self.downloader.downloads_dict[song.id]["messages"])
            time.sleep(0.2)

    def __str__(self) -> str:
        return f"ListDownloader(url={self.url})"

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
            logger.warning("SongDownloader.fetch_song Song already in downloads_dict")
        else:
            self.downloader.downloads_dict[self.spotdl_song.song_id] = {"messages": [{'id': self.spotdl_song.song_id, 'completed': 0, 'total': 100, 'message': 'Processing'}]}
            self.downloader.downloads_ids_dict[get_song_name(self.spotdl_song)] = self.spotdl_song.song_id
            self.download()

    def download(self):
        self.downloader.download_song(spotdl_song=self.spotdl_song, raw_song=self.raw_song)

    def __str__(self) -> str:
        return f"SongDownloader(url={self.url})"

    def status(self):

        threading.current_thread().name = f"Test"

        if not self.spotdl_song or self.spotdl_song.song_id not in self.downloader.downloads_dict:
            text = {'completed': 0, 'total': 100, 'message': 'Fetching'}
            yield f"data: {json.dumps(text)}\n\n"

            while not self.spotdl_song or self.spotdl_song.song_id not in self.downloader.downloads_dict:
                time.sleep(0.5)

        text = {"song": {"id": self.raw_song.id, "name":  self.raw_song.name, "artists":  [artist._json for artist in self.raw_song.artists], "album":  {"images": [images._json for images in self.raw_song.album.images]}}}
        yield f"data: {json.dumps(text)}\n\n"
                
        threading.current_thread().name = f"Status - {self.spotdl_song.name} - {self.spotdl_song.artist}"

        last_messages_len = 0
        finish = False
        while not finish:
            for k in self.downloader.downloads_dict[self.spotdl_song.song_id]["messages"][last_messages_len:]:
                logger.debug(f"SongDownloader.status data: {json.dumps(k)}")
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
        if "/track/" in url or "https://music.youtube.com/watch?v=" in url:
            return SongDownloader(url, self)
        elif "/playlist/" in url or "/album/" in url or "/playlist?list=" in url:
            return ListDownloader(url, self)
        else:
            logger.error(f"Unable to get a download hanlder for '{url}'")


    def download_song(self, spotdl_song: Song, raw_song: RawSpotifyApiTrack | AlbumItems | PlaylistItems, raw_list: RawSpotifyApiAlbum | RawSpotifyApiPlaylist | RawYTMusicApiAlbum | RawYTMusicApiPlaylist=None):

        logger.info(f"Downloader.download_song Downloading {get_song_name(spotdl_song)}")

        relative_album_path = os.path.join(sanitize_folder_name(spotdl_song.artist), sanitize_folder_name(spotdl_song.album_name))
        album_path = os.path.join(os.getenv("SONGS_PATH"), relative_album_path)

        relative_song_path = os.path.join(relative_album_path, get_output_file(spotdl_song).replace(f"{os.getenv('TEMP_PATH')}/", ""))
        song_path = os.path.join(album_path, get_output_file(spotdl_song).replace(f"{os.getenv('TEMP_PATH')}/", ""))

        relative_image_path = os.path.join("album", sanitize_folder_name(spotdl_song.artist), sanitize_folder_name(spotdl_song.album_name), "image.png")
        image_path = os.path.join(os.getenv("IMAGES_PATH"), "album", sanitize_folder_name(spotdl_song.artist), sanitize_folder_name(spotdl_song.album_name))

        if os.path.exists(song_path):
            self.downloads_dict[spotdl_song.song_id]["messages"].append({"id": spotdl_song.song_id, "completed": 100, "total": 100, "message": "Skipping"})
            path = relative_song_path
        else:
            _, path = self.spotify_downloader.search_and_download(spotdl_song)

            if not os.path.exists(album_path):
                os.makedirs(album_path)

            if path == None:
                logger.error(f"Downloader.download_song Error downloading {get_song_name(spotdl_song)}")
                self.downloads_dict[spotdl_song.song_id]["messages"].append({'id': spotdl_song.song_id, 'completed': 100, 'message': 'Error'})
            else: 
                self.downloads_dict[spotdl_song.song_id]["messages"].append({'id': spotdl_song.song_id, 'completed': 100, 'message': 'Done'})
                logger.info(f"Downloader.download_song Downloaded {get_song_name(spotdl_song)}")

                shutil.move(path, song_path)
                path = relative_song_path

        if not os.path.exists(image_path):
            os.makedirs(image_path)

        image_path = os.path.join(image_path, "image.png")
        if not os.path.exists(image_path):
            if raw_list == None: 
                image_url = max(raw_song.album.images, key=lambda i: i.width * i.height)["url"] if raw_song.album.images else None
            elif raw_list.type == "ytPlaylist":
                image_url = max(raw_list.thumbnails, key=lambda i: i.width * i.height)["url"] if raw_list.thumbnails else None
            elif raw_list.type == "album":
                image_url = max(raw_list.images, key=lambda i: i.width * i.height)["url"] if raw_list.images else None
            elif raw_list.type == "playlist":
                image_url = max(raw_song.track.album.images, key=lambda i: i.width * i.height)["url"] if raw_song.track.album.images else None
            
            download_image(url=image_url, path=image_path)

        if raw_list == None:
            requests.post(f"{os.getenv('FRONTEND_URL')}/api/new-song", json={
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
                "path": str(path).replace(os.getenv("SONGS_PATH"), "") if path else None,
                "image": relative_image_path,
                "images": [image._json for image in raw_song.album.images],
                "copyright":  spotdl_song.copyright_text,
                "download_url": spotdl_song.download_url,
                "lyrics": spotdl_song.lyrics,
                "popularity": spotdl_song.popularity,
                "album_id": spotdl_song.album_id,
            })
        elif raw_list.type == "album":
            requests.post(f"{os.getenv('FRONTEND_URL')}/api/new-song", json={
                "name": spotdl_song.name,
                "artists": [{"name": artist.name, "id": artist.id} for artist in raw_song.artists],
                "genres": spotdl_song.genres,
                "disc_number": spotdl_song.disc_number,
                "album_name": spotdl_song.album_name,
                "album_artists": [{"name": artist.name, "id": artist.id} for artist in raw_list.artists],
                "album_type": spotdl_song.album_type,
                "duration": spotdl_song.duration,
                "year": spotdl_song.year,
                "date": spotdl_song.date,
                "track_number": spotdl_song.track_number,
                "tracks_count": spotdl_song.tracks_count,
                "song_id": spotdl_song.song_id,
                "publisher": spotdl_song.publisher,
                "path": str(path).replace(os.getenv("SONGS_PATH"), "") if path else None,
                "image": relative_image_path,
                "images": [image._json for image in raw_list.images],
                "copyright":  spotdl_song.copyright_text,
                "download_url": spotdl_song.download_url,
                "lyrics": spotdl_song.lyrics,
                "popularity": spotdl_song.popularity,
                "album_id": spotdl_song.album_id,
            })
        elif raw_list.type == "playlist":
            requests.post(f"{os.getenv('FRONTEND_URL')}/api/new-song", json={
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
                "path": str(path).replace(os.getenv("SONGS_PATH"), "") if path else None,
                "image": relative_image_path,
                "images": [image._json for image in raw_song.track.album.images],
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
        self.downloads_dict[task_id]["messages"].append({'id': task_id, 'completed': int(completed), 'message': fields['message']})

    def start_task(self, task_id):
        pass

    def remove_task(self, task_id):
        pass