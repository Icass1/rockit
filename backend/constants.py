from typing import Dict
from spotdl.types.options import DownloaderOptions  # type: ignore
from dotenv import load_dotenv
from typing import List
import os

env_files = [".env", ".env.production", ".dockerenv"]

for file in env_files:
    if os.path.exists(file):
        print(f"Loading {file}...")
        os.system(f"bash -c 'set -a && source {file} && set +a'")
        load_dotenv(file)
    else:
        print(f"{file} not found.")

env_vars: Dict[str, str | int] = {}

error = False


def get_env_str(name: str, possible_values: List[str] | None = None) -> str:
    global error
    var = os.getenv(name)
    if not var:
        print(f"Environment variable '{name}' is not set")
        error = True
        return "NONE"

    if possible_values:
        if var not in possible_values:
            error = True
            print(f"Environment variable '{name}' must be {possible_values}")
            return "NONE"

    env_vars[name] = var

    return var


def get_env_int(name: str) -> int:
    global error
    env_str = get_env_str(name)
    try:
        env_vars[name] = int(env_str)
        return int(env_str)
    except:
        print(f"Environment variable '{name}' must be a number, found '{env_str}'")
        error = True
        return 0


BACKEND_URL = get_env_str("BACKEND_URL")
SESSION_DURATION = get_env_int("SESSION_DURATION")
ENVIRONMENT = get_env_str("ENVIRONMENT", ["DEV", "PROD"])
SONGS_PATH = get_env_str("SONGS_PATH")
IMAGES_PATH = get_env_str("IMAGES_PATH")
TEMP_PATH = get_env_str("TEMP_PATH")
LOGS_PATH = get_env_str("LOGS_PATH")
LOG_DUMP_LEVEL = get_env_str("LOG_DUMP_LEVEL", ["debug", "info", "warning", "error"])
CONSOLE_DUMP_LEVEL = get_env_str(
    "CONSOLE_DUMP_LEVEL", ["debug", "info", "warning", "error"]
)
DOWNLOAD_THREADS = get_env_int("DOWNLOAD_THREADS")
CLIENT_ID = get_env_str("CLIENT_ID")
CLIENT_SECRET = get_env_str("CLIENT_SECRET")
YOUTUBE_API_KEY = get_env_str("YOUTUBE_API_KEY")

DB_HOST = get_env_str("DB_HOST")
DB_USER = get_env_str("DB_USER")
DB_PASSWORD = get_env_str("DB_PASSWORD")
DB_PORT = get_env_int("DB_PORT")
DB_NAME = get_env_str("DB_NAME")

SESSION_COOKIE = "session_id"


if error:
    exit()
