from spotdl.download.downloader import Downloader as SpotdlDownloader  # type: ignore

from backend.constants import DOWNLOADER_OPTIONS
from backend.spotify.framework.download.progressHandler import ProgressHandler

# Do not remove the following import, is needed to apply patches
import backend.spotify.framework.download.patches  # type: ignore


class SpotifyDownloader:
    def __init__(self) -> None:
        self.progress_handler = ProgressHandler()

        self.spotdl_downloader = SpotdlDownloader(settings=DOWNLOADER_OPTIONS)
        self.spotdl_downloader.progress_handler.rich_progress_bar = self.progress_handler  # type: ignore
