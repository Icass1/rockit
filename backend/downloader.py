
import asyncio
import threading
import traceback
from logging import Logger
from typing import Dict, List, Tuple
from fastapi import BackgroundTasks, Request
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
        # ******************
        # **** To check ****
        # ******************
        try:
            self.logger.info("Started")
            while True:
                await asyncio.sleep(0.4)

                # Clean up finished threads
                for thread, queue_item in self.download_threads.copy():
                    if not thread.is_alive():
                        self.logger.info(f"Thread {thread.name} has finished")
                        self.download_threads.remove((thread, queue_item))

                # Start new threads if below max
                while len(self.download_threads) < self.max_download_threads and len(self.queue) > 0:
                    self.logger.info("Starting new thread")
                    self.logger.info(f"{threading.enumerate()=}")

                    queue_item: QueueElement = self.queue[0]

                    def thread_target(item: QueueElement):
                        try:
                            # Set up a timer for 10 minutes
                            timer = threading.Timer(interval=600, function=lambda: self.logger.error(
                                f"Download timeout for {item.get_song().song_id}"))
                            timer.start()
                            try:
                                self.download_method(queue_element=item)
                            finally:
                                timer.cancel()
                        except Exception as e:
                            self.logger.error(
                                f"Download failed for {item.get_song().song_id}: {e}")
                            self.logger.debug(traceback.format_exc())

                    thread = threading.Thread(
                        target=thread_target,
                        args=(queue_item,),
                        name=f"Downloader-{queue_item.get_song().song_id}"
                    )
                    thread.start()
                    self.download_threads.append((thread, queue_item))
                    self.queue.pop(0)

        except Exception as e:
            self.logger.critical(f"Error in download manager: {e}")
            self.logger.debug(traceback.format_exc())
