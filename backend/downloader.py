from spotdl.utils.config import SPOTIFY_OPTIONS, DOWNLOADER_OPTIONS
from spotdl.download.downloader import Downloader as SpotifyDownloader
from typing import Any, Callable, Dict, List, Optional

from utils import get_song_name, create_id

class Downloader:
    def __init__(self) -> None:
        self.spotify_downloader = SpotifyDownloader(SPOTIFY_OPTIONS)
        self.spotify_downloader.progress_handler.rich_progress_bar = self

        self.downloads_ids_dict: Dict = {}
        self.downloads_dict = {}

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
        self.downloads_dict[task_id]["messages"].append({'id': task_id, 'completed': int(completed), 'message': fields['message']})

    def start_task(self, task_id):
        pass

    def remove_task(self, task_id):
        pass

    def download_song(self, song):

        download_id = create_id(length=16)

        self.downloads_ids_dict[get_song_name(song)] = download_id
        self.downloads_dict[download_id] = []
        _, path = self.spotify_downloader.search_and_download(song)

        pass