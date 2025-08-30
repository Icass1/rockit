import os
import json
import asyncio
import threading
from logging import Logger
from datetime import datetime
from spotdl.types.song import Song
from typing import List, TYPE_CHECKING, Tuple, Sequence

from fastapi import Request, Response
from fastapi.responses import StreamingResponse

from sqlalchemy import RowMapping, select, update
from sqlalchemy.engine.row import Row
from sqlalchemy.orm import Session

from backend.db.db import RockitDB
from backend.logger import getLogger
from backend.constants import SONGS_PATH
from backend.messageHandler import MessageHandler
from backend.queueElement import QueueElement, SpotifyQueueElement

from backend.db.ormModels.song import SongRow
from backend.db.ormModels.download import STATUS_TYPE, DownloadRow

from backend.spotifyApiTypes.RawSpotifyApiPlaylist import RawSpotifyApiPlaylist

if TYPE_CHECKING:
    from downloader import Downloader


class SpotifyDownloader:
    """
    Class to start spotify album, playlist or song downloads.\n
    An instance of this class is created for every URL that wants to be downloaded.
    """

    _queue_set: bool
    """Will be true when all songs have been fetched and the queue is set."""

    downloader: "Downloader"
    """Download instance."""

    download_id: int
    """Download ID in database."""

    download_public_id: str
    """Download public ID in database."""

    url: str
    """URL to download."""

    def __init__(self, downloader: "Downloader", download_public_id: str, user_id: int, url: str) -> None:
        """
        Constructor of SpotifyDownloader\n
        download_id is an empty list, the constructuor will add the automatically generated download_id by database to the list.  
        """
        self.logger: Logger = getLogger(
            name=__name__, class_name="SpotifyDownloader")

        self.downloader: Downloader = downloader
        self.url: str = url
        self.download_public_id = download_public_id

        self.rockit_db: RockitDB = downloader.rockit_db
        self.message_handler = MessageHandler()

        self.queue_elements: List[QueueElement] = []

        self._queue_set = False
        self.error = False

        def _func(s: Session):
            download_to_add = DownloadRow(
                public_id=download_public_id,
                user_id=user_id,
                date_started=datetime.now(),
                download_url=url
            )

            download_to_add = s.merge(download_to_add)
            s.flush()
            self.download_id = download_to_add.id

        self.rockit_db.execute_with_session(_func)

        asyncio.create_task(self.wait_for_download(
        ), name=f"wait_for_download {url=} {user_id=} {download_public_id=}")

        threading.Thread(target=self.fetch_and_add_to_queue,
                         name=f"fetch_and_add_to_queue {url=} {user_id=} {download_public_id=}").start()

    def update_status_db(self, new_status: STATUS_TYPE):
        """TODO"""

        self.rockit_db.execute_with_session(
            lambda s:
            s.execute(
                update(DownloadRow)
                .where(DownloadRow.id == self.download_id)
                .values(status=new_status)
            )
        )

    def fetch_and_add_to_queue(self) -> None:
        """TODO"""

        self.logger.info(f"Downloading {self.url}")

        spotdl_songs: List[Song] = []
        try:
            if "/track/" in self.url:
                self.logger.info(f"Fetching song {self.url=}")
                self.update_status_db(new_status="fetching")

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
                self.update_status_db(new_status="fetching")

                album = self.downloader.spotify.get_album(
                    self.url.replace("https://open.spotify.com/album/", ""))

                if not album:
                    self.error = True
                    self.update_status_db(new_status="failed")
                    self.logger.error(
                        f"album is None {self.url}")
                    return

                if not album.tracks:
                    self.error = True
                    self.update_status_db(new_status="failed")
                    self.logger.error(
                        f"album.tracks is None {self.url}")
                    return

                if not album.tracks.items:
                    self.error = True
                    self.update_status_db(new_status="failed")
                    self.logger.error(
                        f"album.tracks.items is None {self.url}")
                    return

                out = self.downloader.spotify.get_songs(
                    public_ids=[a.id for a in album.tracks.items if a.id])

                if not out:
                    self.error = True
                    self.update_status_db(new_status="failed")
                    self.logger.error("out is None")
                    return

                for k in out:

                    spotdl_song, song = k
                    spotdl_songs.append(spotdl_song)

                    self.message_handler.add(
                        {'id': spotdl_song.song_id, 'completed': 0, 'message': 'Starting'})

            elif "/playlist/" in self.url:
                self.logger.info(f"Fetching playlist {self.url=}")
                self.update_status_db(new_status="fetching")

                playlist: RawSpotifyApiPlaylist | None = self.downloader.spotify.get_playlist(
                    self.url.replace("https://open.spotify.com/playlist/", ""))

                if not playlist:
                    self.error = True
                    self.update_status_db(new_status="failed")
                    self.logger.error(
                        f"playlist is None {self.url}")
                    return

                if not playlist.tracks:
                    self.error = True
                    self.update_status_db(new_status="failed")
                    self.logger.error(
                        f"playlist.tracks is None {self.url}")
                    return

                if not playlist.tracks.items:
                    self.error = True
                    self.update_status_db(new_status="failed")
                    self.logger.error(
                        f"playlist.tracks.items is None {self.url}")
                    return

                out = self.downloader.spotify.get_songs(
                    public_ids=[a.track.id for a in playlist.tracks.items if a and a.track and a.track.id])

                if not out:
                    self.error = True
                    self.update_status_db(new_status="failed")
                    self.logger.error("out is None")
                    return

                for k in out:

                    spotdl_song, song = k
                    spotdl_songs.append(spotdl_song)

                    self.message_handler.add(
                        {'id': spotdl_song.song_id, 'completed': 0, 'message': 'Starting'})

            else:
                self.error = True
                self.update_status_db(new_status="failed")
                self.logger.error(f"Don't know what to download. {self.url=}")
                return

            self.logger.info(f"Fetch done.")
            self.logger.info(f"Found {len(spotdl_songs)} songs to download")

            songs_in_db: Sequence[Row[Tuple[int, str, str | None]]] = self.rockit_db.execute_with_session(lambda session: session.execute(select(SongRow.id, SongRow.public_id, SongRow.path).where(
                SongRow.public_id.in_([spotdl_song.song_id for spotdl_song in spotdl_songs]))).all())

            for spotdl_song in spotdl_songs:

                song_in_db: RowMapping | None = None

                for k in songs_in_db:
                    if k._mapping[SongRow.public_id] == spotdl_song.song_id:
                        song_in_db = k._mapping

                if not song_in_db:
                    self.message_handler.add(
                        {'id': spotdl_song.song_id, 'completed': 0, 'message': 'Error'})
                    self.logger.error("song_db is None. This should never happen")
                    continue

                if song_in_db[SongRow.path] and os.path.exists(os.path.join(SONGS_PATH, song_in_db[SongRow.path])):
                    self.logger.info(
                        f"Skipping song with public id: {song_in_db[SongRow.public_id]}")
                    self.message_handler.add(
                        {'id': song_in_db[SongRow.public_id], 'completed': 100, 'message': 'Skipped'})

                else:
                    queue_element = SpotifyQueueElement(
                        message_handler=self.message_handler, rockit_db=self.downloader.rockit_db, song=spotdl_song)

                    self.downloader.queue.append(queue_element)
                    self.queue_elements.append(queue_element)

                    self.message_handler.add(
                        {'id': spotdl_song.song_id, 'completed': 0, 'message': 'In queue'})

            self._queue_set = True

            # Fetch spotify https://open.spotify.com/intl-es/track/5EvLXXAKicvIF3LegVMlJj?si=f22cd441145541a9
        except Exception as e:
            self.logger.error(f"Error fetching and adding to queue. ({e})")
            self.error = True

    async def wait_for_download(self):
        """TODO"""

        self.logger.info("Waiting for queue setup")

        while not self._queue_set:
            if self.error:
                self.update_status_db(new_status="failed")
                self.logger.error("Error found while waiting queue")
                self.message_handler.finish()
                return
            await asyncio.sleep(0)

        self.update_status_db(new_status="waiting_for_songs")

        self.logger.info("Waiting for songs")
        for queue_element in self.queue_elements:
            await queue_element.get_done()

        self.logger.info(
            f"Done - All songs have finished. Success {sum([1 if queue_element.get_success() else 0 for queue_element in self.queue_elements])} - Fail {sum([0 if queue_element.get_success() else 1 for queue_element in self.queue_elements])}")

        self.logger.warning("Run after all songs finish")

        self.update_status_db(
            new_status="completed")

        self.rockit_db.execute_with_session(
            lambda s: s.execute(
                update(DownloadRow)
                .where(DownloadRow.id == self.download_id)
                .values(
                    success=sum([1 if queue_element.get_success()
                                else 0 for queue_element in self.queue_elements]),
                    fail=sum([0 if queue_element.get_success()
                              else 1 for queue_element in self.queue_elements]),
                    date_ended=datetime.now()
                )
            )
        )

        self.message_handler.finish()

    def status(self, request: Request) -> StreamingResponse | Response:
        """TODO"""

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
