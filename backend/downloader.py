
import asyncio
from logging import Logger
from typing import Dict, List, Tuple

from fastapi import BackgroundTasks, Request
import threading
from spotdl.download.downloader import Downloader as SpotdlDownloader


from backend.youtubeDownloader import YoutubeMusicDownloader
from backend.progressHandler import ProgressHandler
from backend.backendUtils import create_id, get_song_name
from backend.queueElement import QueueElement
from backend.spotifyDownloader import SpotifyDownloader
from backend.spotify import Spotify
from backend.constants import DOWNLOADER_OPTIONS
from backend.logger import getLogger

# Do not remove the following import, is needed to apply patches
import backend.patches


class Downloader:
    def __init__(self) -> None:
        global init
        self.logger: Logger = getLogger(name=__name__, class_name="Downloader")
        self.logger.info(f"Init")

        self.progress_handler = ProgressHandler()

        self.spotdl_downloader = SpotdlDownloader(settings=DOWNLOADER_OPTIONS)
        self.spotdl_downloader.progress_handler.rich_progress_bar = self.progress_handler  # type: ignore

        self.spotify = Spotify()

        self.max_download_threads: int = 4
        self.queue: List[QueueElement] = []
        self.download_threads: List[Tuple[threading.Thread, QueueElement]] = []

        self.downloaders: Dict[str, SpotifyDownloader |
                               YoutubeMusicDownloader] = {}

        self.check_downloads_in_db()

    def check_downloads_in_db(self):
        self.logger.warning("TODO")

    def download_url(self, url: str, background_tasks: BackgroundTasks, user_id: str) -> str:

        url = self.spotify.parse_url(url)

        download_id = create_id()

        self.logger.info(f"{url=} {download_id=}")

        if "open.spotify.com" in url:
            self.downloaders[download_id] = SpotifyDownloader(
                user_id=user_id,
                downloader=self,
                download_id=download_id,
                url=url
            )
        elif "music.youtube.com" in url:
            self.downloaders[download_id] = YoutubeMusicDownloader(
                downloader=self, download_id=download_id)
        else:
            self.logger.error("Unknown provider")

        return download_id

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
            self.logger.info("Started")
            while True:
                await asyncio.sleep(0.4)

                for thread in self.download_threads:
                    if not thread[0].is_alive():
                        self.logger.info("Thread has finished")
                        self.download_threads.remove(thread)

                while len(self.download_threads) < self.max_download_threads and len(self.queue) > 0:
                    self.logger.info("Starting new thread")

                    self.logger.info(f"{threading.enumerate()=}")

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
