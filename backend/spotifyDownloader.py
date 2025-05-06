

import asyncio
from logging import Logger
from typing import Any, Dict, List, Optional, TYPE_CHECKING

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

from constants import DOWNLOADER_OPTIONS, SONGS_PATH
from logger import getLogger

from queueElement import QueueElement, SpotifyQueueElement
from messageHandler import MessageHandler
from spotify import Spotify
from backendUtils import create_id, download_image, get_song_name, get_utc_date, sanitize_folder_name

from db.image import ImageDB
from db.commonTypes import ArtistDB
from db.song import SongDBFull
from db.album import AlbumDBFull
from db.db import DB

from spotifyApiTypes.RawSpotifyApiTrack import RawSpotifyApiTrack, TrackArtists
from spotifyApiTypes.RawSpotifyApiAlbum import RawSpotifyApiAlbum, AlbumItems
from spotifyApiTypes.RawSpotifyApiPlaylist import RawSpotifyApiPlaylist, PlaylistItems, PlaylistAlbum, PlaylistArtists, PlaylistTracks
from spotifyApiTypes.RawSpotifyApiArtist import RawSpotifyApiArtist
from spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults, SpotifySearchResultsItems2
from ytMusicApiTypes.RawYTMusicApiPlaylist import RawYTMusicApiPlaylist
from ytMusicApiTypes.RawYTMusicApiAlbum import RawYTMusicApiAlbum
from ytMusicApiTypes.RawYTMusicApiSong import RawYTMusicApiSong
from rockItApiTypes.RawRockItApiAlbum import RawRockItApiAlbum

if TYPE_CHECKING:
    from downloader import Downloader


class SpotifyDownloader:
    """Class to start spotify album, playlist or song downloads."""

    def __init__(self, downloader: "Downloader", download_id: str, user_id: str, url: str) -> None:
        self.logger: Logger = getLogger(
            name=__name__, class_name="SpotifyDownloader")

        self.downloader: Downloader = downloader
        self.download_id: str = download_id
        self.url: str = url

        self.message_handler = MessageHandler()

        self.logger.info("")

        asyncio.create_task(self.wait_for_download())

        threading.Thread(target=self.fetch_and_add_to_queue).start()

        self.queue_elements: List[QueueElement] = []

        self._queue_set = False

        self.downloader.spotify.db.execute(
            query="INSERT INTO download (id, userId, dateStarted, downloadURL, status, seen) VALUES(?, ?, ?, ?, ?, ?)", parameters=(
                download_id,
                user_id,
                get_utc_date(),
                url,
                "starting",
                "0"
            )
        )

    def update_status_db(self, status: str):
        self.downloader.spotify.db.execute(
            query="UPDATE download SET status = ? WHERE id = ?",
            parameters=(status, self.download_id)
        )

    def fetch_and_add_to_queue(self) -> None:

        self.logger.info(f"Downloading {self.url}")

        spotdl_songs: List[Song] = []

        if "/track/" in self.url:
            self.update_status_db("Fetching song")

            out = self.downloader.spotify.get_song(
                self.url.replace("https://open.spotify.com/track/", ""))

            if not out:
                self.logger.error(f"out is None. {self.url=}")
                return

            spotdl_song, song = out

            spotdl_songs.append(spotdl_song)

            self.message_handler.add(
                {'id': spotdl_song.song_id, 'completed': 0, 'message': 'Starting'})

        elif "/album/" in self.url:
            self.update_status_db("Fetching album")

            album = self.downloader.spotify.get_album(
                self.url.replace("https://open.spotify.com/album/", ""))

            out = self.downloader.spotify.get_songs(
                ids=[a.id for a in album.tracks.items])

            if not out:

                self.logger.error("out is None")
                return

            for k in out:

                spotdl_song, song = k
                spotdl_songs.append(spotdl_song)

                self.message_handler.add(
                    {'id': spotdl_song.song_id, 'completed': 0, 'message': 'Starting'})

        else:
            self.update_status_db("Error. Don't know what to download")
            self.logger.error(f"Don't know what to download. {self.url=}")
            return

        for spotdl_song in spotdl_songs:

            song_db: SongDBFull = self.downloader.spotify.db.get(
                "SELECT * FROM song WHERE id = ?", (spotdl_song.song_id,))

            if not song_db:
                self.message_handler.add(
                    {'id': song_db.id, 'completed': 0, 'message': 'Error'})
                self.logger.error("song_db is None. This should never happen")
                continue

            if song_db.path and os.path.exists(os.path.join(SONGS_PATH, song_db.path)):
                self.logger.info(f"Skipping {song_db.id}")
                self.message_handler.add(
                    {'id': song_db.id, 'completed': 100, 'message': 'Skipped'})

            else:
                queue_element = SpotifyQueueElement(
                    message_handler=self.message_handler, song=spotdl_song, db=self.downloader.spotify.db)

                self.downloader.queue.append(queue_element)
                self.queue_elements.append(queue_element)

                self.message_handler.add(
                    {'id': spotdl_song.song_id, 'completed': 0, 'message': 'In queue'})

        self._queue_set = True

        # Fetch spotify https://open.spotify.com/intl-es/track/5EvLXXAKicvIF3LegVMlJj?si=f22cd441145541a9

    async def wait_for_download(self):
        self.logger.info("Waiting for queue setup")

        self.update_status_db(status="Waiting for queue setup")

        while not self._queue_set:
            await asyncio.sleep(0)

        self.logger.info("Waiting for songs")
        for queue_element in self.queue_elements:
            await queue_element.get_done()

        self.logger.info(
            f"Done - All songs have finished. Success {sum([1 if queue_element.get_success() else 0 for queue_element in self.queue_elements])} - Fail {sum([0 if queue_element.get_success() else 1 for queue_element in self.queue_elements])}")

        self.logger.warn("Run after all songs finish")

        self.update_status_db(
            status=f"ended - Success {sum([1 if queue_element.get_success() else 0 for queue_element in self.queue_elements])} - Fail {sum([0 if queue_element.get_success() else 1 for queue_element in self.queue_elements])}")

        self.message_handler.finish()

    def status(self, request: Request) -> StreamingResponse:
        self.logger.info(self.download_id)

        reader = self.message_handler.get_reader()

        self.logger.debug(self.message_handler._messages)

        async def event_generator():
            while True:
                if await request.is_disconnected():
                    break
                try:
                    if reader.get_finish():
                        break

                    message = await reader.get()

                    if message == None and reader.get_finish():
                        self.logger.info("Reader has finish")
                        break

                    yield f"data: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    # Send keep-alive to prevent connection from closing
                    yield ": keep-alive\n\n"

            self.logger.info(f"Finished {self.download_id}")

        return StreamingResponse(event_generator(), media_type="text/event-stream")
