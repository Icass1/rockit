
import asyncio
from pathlib import Path
from spotdl.types.song import Song
import os
import shutil

from backendUtils import get_output_file, sanitize_folder_name
from db.db import DB
from logger import getLogger
from messageHandler import MessageHandler


_SONGS_PATH = os.getenv(key="SONGS_PATH")
_TEMP_PATH = os.getenv(key="TEMP_PATH")
logger = getLogger(__name__)

if not _TEMP_PATH:
    logger.critical("SONGS_PATH is not set")
    exit()

if not _SONGS_PATH:
    logger.critical("SONGS_PATH is not set")
    exit()

SONGS_PATH = _SONGS_PATH
TEMP_PATH = _TEMP_PATH


class QueueElement:
    def __init__(self, message_handler: MessageHandler, song: Song) -> None:
        self._song: Song = song
        self._message_handler: MessageHandler = message_handler
        self._done = False
        self._success: None | bool = None
        self.logger = getLogger(__name__, "QueueElement")

        self._path: None | Path = None

    def get_song(self) -> Song:
        return self._song

    def get_message_handler(self) -> MessageHandler:
        return self._message_handler

    def set_path(self, path: Path | None):
        self._path = path

    def done(self, success: bool) -> None:
        self._done = True
        self._message_handler.finish()
        self._success = success
        self.on_done()

    def get_success(self) -> None | bool:
        return self._success

    def on_done(self):
        self.logger.warn("This function should be overwritten")

    async def get_done(self):
        while not self._done:
            await asyncio.sleep(0)

        return True


class SpotifyQueueElement(QueueElement):
    def __init__(self, message_handler: MessageHandler, song: Song, db: DB) -> None:
        super().__init__(message_handler, song)
        self.logger = getLogger(__name__, "SpotifyQueueElement")

        self.db = db

    def on_done(self):

        if not self._path:
            self.logger.error(f"Path is not set. {self._song=}")
            
            self.db.execute("""
                UPDATE song SET
                    lyrics = ?,
                    downloadUrl = ?
                WHERE id = ?
            """, (self._song.lyrics, self._song.download_url, self._song.song_id))
            return

        artist = sanitize_folder_name(
            self._song.artist)

        album = sanitize_folder_name(self._song.album_name)

        song = sanitize_folder_name(get_output_file(
            self._song).replace(f"{TEMP_PATH}/", ""))

        song_path = os.path.join(SONGS_PATH, artist, album, song)

        song_path_db = os.path.join(artist, album, song)

        self.logger.info(
            f"{artist=} - {album=} - {song=} - {song_path=} - {song_path_db=}")

        shutil.move(src=str(self._path), dst=song_path)

        self.db.execute("""
            UPDATE song SET
                lyrics = ?,
                downloadUrl = ?,
                path = ?
            WHERE id = ?
        """, (self._song.lyrics, self._song.download_url, song_path_db, self._song.song_id))
