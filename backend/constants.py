from typing import Dict
from spotdl.types.options import DownloaderOptions
from dotenv import load_dotenv
import os
import sys

print(os.listdir())

env_files = [".env", ".env.production", ".dockerenv"]

for file in env_files:
    if os.path.exists(file):
        with open(file, "r") as f:
            print(f"{file:=^50}")
            print(f.read())
            print("="*50)

        print(f"Loading {file}...")
        os.system(f"bash -c 'set -a && source {file} && set +a'")
        load_dotenv(file)
    else:
        print(f"{file} not found.")

env_vars: Dict[str, str | int] = {}

def get_env_str(name: str) -> str:
    var = os.getenv(name)
    if not var:
        print(f"Environment variable '{name}' is not set")
        sys.exit(1)
    env_vars[name] = var

    return var


def get_env_int(name: str) -> int:
    env_str = get_env_str(name)
    try:
        env_vars[name] = int(env_str)
        return int(env_str)
    except:
        print(f"Environment variable '{name}' must be a number, '{env_str}'")
        exit()


BACKEND_URL = get_env_str("BACKEND_URL")
SESSION_DURATION = get_env_int("SESSION_DURATION")
ENVIRONMENT = get_env_str("ENVIRONMENT")
SONGS_PATH = get_env_str("SONGS_PATH")
IMAGES_PATH = get_env_str("IMAGES_PATH")
TEMP_PATH = get_env_str("TEMP_PATH")
LOGS_PATH = get_env_str("LOGS_PATH")
LOG_DUMP_LEVEL = get_env_str("LOG_DUMP_LEVEL")
CONSOLE_DUMP_LEVEL = get_env_str("CONSOLE_DUMP_LEVEL")
DOWNLOAD_THREADS = get_env_int("DOWNLOAD_THREADS")
CLIENT_ID = get_env_str("CLIENT_ID")
CLIENT_SECRET = get_env_str("CLIENT_SECRET")

DB_HOST = get_env_str("DB_HOST")
DB_USER = get_env_str("DB_USER")
DB_PASSWORD = get_env_str("DB_PASSWORD")
DB_PORT = get_env_int("DB_PORT")
DB_DATABASE = get_env_str("DB_DATABASE")

SESSION_COOKIE = "session_id"


DOWNLOADER_OPTIONS: DownloaderOptions = {
    "audio_providers": ["youtube-music", "youtube"],
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
    "playlist_retain_track_cover": False
}
