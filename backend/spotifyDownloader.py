

import asyncio
from logging import Logger
from typing import List, TYPE_CHECKING

from fastapi import Request, Response
from fastapi.responses import StreamingResponse
import threading
import os
import json

from spotdl.types.song import Song

from constants import SONGS_PATH
from logger import getLogger

from queueElement import QueueElement, SpotifyQueueElement
from messageHandler import MessageHandler
from backendUtils import get_utc_date


from spotifyApiTypes.RawSpotifyApiPlaylist import RawSpotifyApiPlaylist

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

        asyncio.create_task(self.wait_for_download(), name=f"wait_for_download {url=} {user_id=} {download_id=}")

        self.logger.info(f"{threading.enumerate()=}")

        threading.Thread(target=self.fetch_and_add_to_queue, name=f"fetch_and_add_to_queue {url=} {user_id=} {download_id=}").start()

        self.queue_elements: List[QueueElement] = []

        self._queue_set = False

        self.error = False

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
            self.logger.info(f"Fetching song {self.url=}")
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
            self.logger.info(f"Fetching album {self.url=}")
            self.update_status_db("Fetching album")

            album = self.downloader.spotify.get_album(
                self.url.replace("https://open.spotify.com/album/", ""))

            if not album:
                self.error = True
                self.update_status_db(f"album is None ")
                self.logger.error(
                    f"album is None {self.url}")
                return

            if not album.tracks:
                self.error = True
                self.update_status_db(f"album.tracks is None ")
                self.logger.error(
                    f"album.tracks is None {self.url}")
                return

            if not album.tracks.items:
                self.error = True
                self.update_status_db("album.tracks.items is None")
                self.logger.error(
                    f"album.tracks.items is None {self.url}")
                return

            out = self.downloader.spotify.get_songs(
                ids=[a.id for a in album.tracks.items if a.id])

            if not out:
                self.error = True
                self.update_status_db("out is None")
                self.logger.error("out is None")
                return

            for k in out:

                spotdl_song, song = k
                spotdl_songs.append(spotdl_song)

                self.message_handler.add(
                    {'id': spotdl_song.song_id, 'completed': 0, 'message': 'Starting'})

        elif "/playlist/" in self.url:
            self.logger.info(f"Fetching playlist {self.url=}")
            self.update_status_db("Fetching playlist")

            playlist: RawSpotifyApiPlaylist | None = self.downloader.spotify.get_playlist(
                self.url.replace("https://open.spotify.com/playlist/", ""))

            if not playlist:
                self.error = True
                self.update_status_db(f"playlist is None ")
                self.logger.error(
                    f"playlist is None {self.url}")
                return

            if not playlist.tracks:
                self.error = True
                self.update_status_db(f"playlist.tracks is None ")
                self.logger.error(
                    f"playlist.tracks is None {self.url}")
                return

            if not playlist.tracks.items:
                self.error = True
                self.update_status_db(f"playlist.tracks.items is None ")
                self.logger.error(
                    f"playlist.tracks.items is None {self.url}")
                return

            out = self.downloader.spotify.get_songs(
                ids=[a.track.id for a in playlist.tracks.items if a and a.track and a.track.id])

            if not out:
                self.error = True
                self.update_status_db("out is None")
                self.logger.error("out is None")
                return

            for k in out:

                spotdl_song, song = k
                spotdl_songs.append(spotdl_song)

                self.message_handler.add(
                    {'id': spotdl_song.song_id, 'completed': 0, 'message': 'Starting'})

        else:
            self.error = True
            self.update_status_db("Error. Don't know what to download")
            self.logger.error(f"Don't know what to download. {self.url=}")
            return

        self.logger.info(f"Fetch done.")
        self.logger.info(f"Found {len(spotdl_songs)} songs to download")

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
            if self.error:
                self.update_status_db(status="Error found while waiting queue")
                self.logger.error("Error found while waiting queue")
                self.message_handler.finish()
                return
            await asyncio.sleep(0)

        self.update_status_db(status="Waiting for songs")

        self.logger.info("Waiting for songs")
        for queue_element in self.queue_elements:
            await queue_element.get_done()

        self.logger.info(
            f"Done - All songs have finished. Success {sum([1 if queue_element.get_success() else 0 for queue_element in self.queue_elements])} - Fail {sum([0 if queue_element.get_success() else 1 for queue_element in self.queue_elements])}")

        self.logger.warning("Run after all songs finish")

        self.update_status_db(
            status=f"ended")

        self.downloader.spotify.db.execute(
            query="UPDATE download SET success = ?, fail = ?, dateEnded = ? WHERE id = ?",
            parameters=(
                sum([1 if queue_element.get_success()
                    else 0 for queue_element in self.queue_elements]),
                sum([0 if queue_element.get_success()
                    else 1 for queue_element in self.queue_elements]),
                get_utc_date(),
                self.download_id
            )
        )

        self.message_handler.finish()

    def status(self, request: Request) -> StreamingResponse | Response:
        if self.error:
            self.logger.warning(f"Downloader {self.download_id} has an error.")
            return Response("Error in spotifyDownloader", 500)

        self.logger.info(f"Started status for download {self.download_id}")

        reader = self.message_handler.get_reader()

        self.logger.debug(self.message_handler._messages)

        async def event_generator():
            while True:
                if await request.is_disconnected():
                    break
                if self.error:
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
