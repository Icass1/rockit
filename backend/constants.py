
from spotdl.types.options import DownloaderOptions
import os

from dotenv import load_dotenv
load_dotenv()


_SONGS_PATH = os.getenv(key="SONGS_PATH")
_IMAGES_PATH = os.getenv("IMAGES_PATH")
_TEMP_PATH = os.getenv("TEMP_PATH")
_LOGS_PATH = os.getenv(key="LOGS_PATH")
_LOG_DUMP_LEVEL = os.getenv(key="LOG_DUMP_LEVEL")

if not _SONGS_PATH:
    print("SONGS_PATH is not set")
    exit()

if not _IMAGES_PATH:
    print("IMAGES_PATH is not set")
    exit()

if not _TEMP_PATH:
    print("TEMP_PATH is not set")
    exit()

if not _LOGS_PATH:
    print("LOGS_PATH is not set")
    exit()

if not _LOG_DUMP_LEVEL:
    print("LOG_DUMP_LEVEL is not set")
    exit()

SONGS_PATH = _SONGS_PATH
IMAGES_PATH = _IMAGES_PATH
TEMP_PATH = _TEMP_PATH
LOGS_PATH = _LOGS_PATH
LOG_DUMP_LEVEL = _LOG_DUMP_LEVEL


DOWNLOADER_OPTIONS: DownloaderOptions = {
    "audio_providers": ["youtube-music"],
    "lyrics_providers": ["genius", "azlyrics", "musixmatch"],
    "genius_token": "alXXDbPZtK1m2RrZ8I4k2Hn8Ahsd0Gh_o076HYvcdlBvmc0ULL1H8Z8xRlew5qaG",
    "playlist_numbering": False,
    "scan_for_songs": False,
    "m3u": None,
    "output": f"{TEMP_PATH}" + "/{artists} - {title}.{output-ext}",
    "overwrite": "skip",
    "search_query": None,
    "ffmpeg": "ffmpeg",
    "bitrate": None,
    "ffmpeg_args": None,
    "format": "mp3",
    "save_file": None,
    "filter_results": True,
    "album_type": None,
    "threads": 4,
    "cookie_file": None,
    "restrict": None,
    "print_errors": False,
    "sponsor_block": False,
    "preload": False,
    "archive": None,
    "load_config": True,
    "log_level": "INFO",
    "simple_tui": False,
    "fetch_albums": False,
    "id3_separator": "/",
    "ytm_data": False,
    "add_unavailable": False,
    "generate_lrc": False,
    "force_update_metadata": False,
    "only_verified_results": False,
    "sync_without_deleting": False,
    "max_filename_length": None,
    "yt_dlp_args": None,
    "detect_formats": None,
    "save_errors": None,
    "ignore_albums": None,
    "proxy": None,
    "skip_explicit": False,
    "log_format": None,
    "redownload": True,
    "skip_album_art": False,
    "create_skip_file": False,
    "respect_skip_file": False,
    "sync_remove_lrc": False,
}

