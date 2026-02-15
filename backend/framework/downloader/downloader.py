import asyncio
import threading
from logging import Logger
from typing import Dict, List, Tuple
from fastapi import BackgroundTasks, Request
from spotdl.download.downloader import Downloader as SpotdlDownloader

from backend.db.db import RockitDB
from backend.framework.spotify.spotify import Spotify
from backend.framework.downloader.queueElement import QueueElement
from backend.framework.downloader.progressHandler import ProgressHandler
from backend.framework.downloader.spotifyDownloader import SpotifyDownloader
from backend.framework.downloader.youtubeDownloader import YoutubeMusicDownloader
from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id, get_song_name
from backend.constants import DOWNLOAD_THREADS, DOWNLOADER_OPTIONS

# Do not remove the following import, is needed to apply patches
import backend.framework.downloader.patches


class Downloader:
    """RockIt music downloader."""

    max_download_threads: int
    """Max number of concurrent downloads."""

    def __init__(self, rockit_db: RockitDB) -> None:
        self.logger: Logger = getLogger(name=__name__, class_name="Downloader")

        self.progress_handler = ProgressHandler()
        self.rockit_db: RockitDB = rockit_db

        self.spotdl_downloader = SpotdlDownloader(settings=DOWNLOADER_OPTIONS)
        self.spotdl_downloader.progress_handler.rich_progress_bar = self.progress_handler  # type: ignore

        self.spotify = Spotify(rockit_db=self.rockit_db)

        self.queue: List[QueueElement] = []
        self.download_threads: List[Tuple[threading.Thread, QueueElement]] = []

        self.downloaders: Dict[str, SpotifyDownloader |
                               YoutubeMusicDownloader] = {}

        self.set_max_download_threads(DOWNLOAD_THREADS)
        self.check_downloads_in_db()

    def check_downloads_in_db(self):
        self.logger.error("Not implemented error.")

    def set_max_download_threads(self, new_max: int):
        self.max_download_threads = new_max
        self.logger.info(
            f"Current max download threads: {self.max_download_threads}.")

    def download_url(self, url: str, background_tasks: BackgroundTasks, user_id: int) -> str:

        url = self.spotify.parse_url(url)

        download_public_id = create_id()

        if "open.spotify.com" in url:
            self.downloaders[download_public_id] = SpotifyDownloader(
                user_id=user_id,
                downloader=self,
                download_public_id=download_public_id,
                url=url
            )
        elif "music.youtube.com" in url:
            self.downloaders[download_public_id] = YoutubeMusicDownloader(
                downloader=self, download_public_id=download_public_id)
        else:
            self.logger.error("Unknown provider")

        self.logger.info(f"{url=} {download_public_id=}")

        return download_public_id

    def download_status(self, request: Request, download_id):

        if not download_id in self.downloaders:
            return "Not found"

        return self.downloaders[download_id].status(request)

    def download_method(self, queue_element: QueueElement):

        self.progress_handler.downloads_ids_dict[get_song_name(
            queue_element.get_song())] = queue_element.get_song().song_id

        self.progress_handler.downloads_dict[queue_element.get_song(
        ).song_id] = queue_element.get_message_handler()

        out_song, path = self.spotdl_downloader.search_and_download(
            queue_element.get_song())

        queue_element.set_path(path)
        queue_element.done(success=True if path else False)

        self.logger.warning(
            "Should clean downloads_ids_dict and downloads_dict")

    async def download_manager(self):
        try:
            self.logger.info("Started download manager.")
            while True:
                await asyncio.sleep(0.4)

                for thread in self.download_threads:
                    if not thread[0].is_alive():
                        self.logger.info("Thread has finished")
                        self.download_threads.remove(thread)

                while len(self.download_threads) < self.max_download_threads and len(self.queue) > 0:
                    self.logger.info("Starting new thread")

                    thread = threading.Thread(
                        target=self.download_method, args=(self.queue[0],), name=f"Downloader-{self.queue[0].get_song().song_id}")

                    thread.start()
                    self.download_threads.append((thread, self.queue[0]))

                    self.queue.pop(0)

                # for index, queue_element in enumerate(self.queue):
                #     queue_element.get_message_handler().add(
                #         message={'id': queue_element.get_song().song_id, 'queue': index + 1})

        except Exception as e:
            self.logger.critical(f"Error {e}")
