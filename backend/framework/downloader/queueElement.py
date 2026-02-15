
import asyncio
from pathlib import Path
from spotdl.types.song import Song
import os
import shutil

from sqlalchemy import select
from sqlalchemy.orm.session import Session

from backend.db.db import RockitDB
from backend.db.ormModels.main.song import SongRow
from backend.framework.downloader.messageHandler import MessageHandler
from backend.constants import SONGS_PATH, TEMP_PATH
from backend.utils.logger import getLogger
from backend.utils.backendUtils import get_output_file, sanitize_folder_name


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
        self._success = success
        self.on_done()

    def get_success(self) -> None | bool:
        return self._success

    def on_done(self):
        self.logger.warning("This function should be overwritten")

    async def get_done(self):
        while not self._done:
            await asyncio.sleep(0)

        return True


class SpotifyQueueElement(QueueElement):
    def __init__(self, message_handler: MessageHandler, rockit_db: RockitDB, song: Song) -> None:
        super().__init__(message_handler, song)

        self.logger = getLogger(__name__, "SpotifyQueueElement")
        self._rockit_db: RockitDB = rockit_db

    def on_done(self):

        if not self._path:
            self.logger.error(f"Path is not set.")

            with self._rockit_db.session_scope() as s:
                song_in_db: SongRow | None = s.execute(select(SongRow).where(
                    SongRow.public_id == self._song.song_id)
                ).scalar_one_or_none()

                if not song_in_db:
                    self.logger.error(
                        f"Song not found in database. {self._song=}")
                    return

                if self._song.download_url:
                    song_in_db.download_url = self._song.download_url
                if self._song.lyrics:
                    song_in_db.lyrics = self._song.lyrics

            return

        artist = sanitize_folder_name(
            self._song.artist)

        album = sanitize_folder_name(self._song.album_name)

        song_path = sanitize_folder_name(get_output_file(
            self._song).replace(f"{TEMP_PATH}/", ""))

        if not os.path.exists(SONGS_PATH):
            self.logger.info(f"Creating directory {SONGS_PATH}")
            os.mkdir(SONGS_PATH)

        final_song_path = os.path.join(SONGS_PATH, artist, album, song_path)

        song_path_db = os.path.join(artist, album, song_path)

        self.logger.info(
            f"{artist=} - {album=} - {song_path=} - {final_song_path=} - {song_path_db=}")

        if not os.path.exists(os.path.join(SONGS_PATH, artist)):
            self.logger.info(
                f"Creating directory {os.path.join(SONGS_PATH, artist)}")
            os.mkdir(os.path.join(SONGS_PATH, artist))

        if not os.path.exists(os.path.join(SONGS_PATH, artist, album)):
            self.logger.info(
                f"Creating directory {os.path.join(SONGS_PATH, artist, album)}")
            os.mkdir(os.path.join(SONGS_PATH, artist, album))

        try:
            shutil.move(src=str(self._path), dst=final_song_path)
        except FileNotFoundError:
            self.logger.error(
                f"Unable to find file {self._path} to move to {final_song_path}.")
            return

        def _update(s: Session):

            song_db = s.execute(select(SongRow).where(
                SongRow.public_id == self._song.song_id)).scalar_one_or_none()
            if not song_db:
                self.logger.error(f"Song not found in database. {self._song=}")
                return

            if self._song.download_url:
                song_db.download_url = self._song.download_url
            if self._song.lyrics:
                song_db.lyrics = self._song.lyrics
            song_db.path = song_path_db

        self._rockit_db.execute_with_session(_update)

        self.logger.info(f"Moved song to {final_song_path}")

        self.get_message_handler().add(
            message={"completed": 100, "message": "Done", "id": self._song.song_id}, force=True)
