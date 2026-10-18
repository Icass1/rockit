import os
import sys
from typing import Dict
from typing import List
from dotenv import load_dotenv

env_file = os.environ.get("ROCKIT_ENV_FILE")
if env_file:
    env_files = [env_file]
else:
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
    if var is None:
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


def get_optional_env_str(name: str, default: str) -> str:
    """Read an optional environment variable. Unlike get_env_str, a missing
    value never aborts startup — the default is used instead."""

    var = os.getenv(name)
    if var is None or var.strip() == "":
        return default
    return var.strip()


def get_optional_env_float(name: str, default: float) -> float:
    """Read an optional numeric environment variable, falling back to the
    default when it is missing or not a number."""

    var = get_optional_env_str(name, default="")
    if var == "":
        return default
    try:
        return float(var)
    except ValueError:
        print(f"Environment variable '{name}' must be a number, using {default}")
        return default


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
CORS_URLS = get_env_str("CORS_URLS", possible_values=None)
SESSION_DURATION = get_env_int("SESSION_DURATION")
SESSION_DURATION_REMEMBER_ME = get_env_int("SESSION_DURATION_REMEMBER_ME")
PROD_WEB_SESSION_DOMAIN = get_env_str("PROD_WEB_SESSION_DOMAIN")
PROD_MOBILE_SESSION_DOMAIN = get_env_str("PROD_MOBILE_SESSION_DOMAIN")
ENVIRONMENT = get_env_str("ENVIRONMENT", ["DEV", "PROD"])
MEDIA_PATH = get_env_str("MEDIA_PATH")
IMAGES_PATH = get_env_str("IMAGES_PATH")
TEMP_PATH = get_env_str("TEMP_PATH")
LOGS_PATH = get_env_str("LOGS_PATH")
LOG_DUMP_LEVEL = get_env_str("LOG_DUMP_LEVEL", ["debug", "info", "warning", "error"])
CONSOLE_DUMP_LEVEL = get_env_str(
    "CONSOLE_DUMP_LEVEL", ["debug", "info", "warning", "error"]
)
DOWNLOAD_THREADS = get_env_int("DOWNLOAD_THREADS")
BUILDS_PATH = get_env_str("BUILDS_PATH")
CHUNK_SIZE = 1024 * 1024  # 1MB per chunk
CLIENT_ID = get_env_str("CLIENT_ID")
CLIENT_SECRET = get_env_str("CLIENT_SECRET")
YOUTUBE_API_KEY = get_env_str("YOUTUBE_API_KEY")

# --- Recommendations ---------------------------------------------------------
# Local recommendations need no configuration. Everything below is optional and
# only affects the opt-in external "discover" suggestions.
# Last.fm API key (secret). When unset the Last.fm provider is disabled.
LASTFM_API_KEY = get_optional_env_str("LASTFM_API_KEY", default="")
# Ordered, comma separated external providers to try. The first one that
# returns usable suggestions wins; set to "none" to disable all of them.
RECOMMENDATION_EXTERNAL_PROVIDERS = get_optional_env_str(
    "RECOMMENDATION_EXTERNAL_PROVIDERS", default="listenbrainz,lastfm"
)
# Per-request timeout for external providers, in seconds.
RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS = get_optional_env_float(
    "RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS", default=5.0
)
# How long successful external suggestions are reused before re-fetching.
RECOMMENDATION_EXTERNAL_CACHE_HOURS = get_optional_env_float(
    "RECOMMENDATION_EXTERNAL_CACHE_HOURS", default=24.0
)
LISTENBRAINZ_API_URL = get_optional_env_str(
    "LISTENBRAINZ_API_URL", default="https://api.listenbrainz.org"
)

DB_HOST = get_env_str("DB_HOST")
DB_USER = get_env_str("DB_USER")
DB_PASSWORD = get_env_str("DB_PASSWORD")
DB_PORT = get_env_int("DB_PORT")
DB_NAME = get_env_str("DB_NAME")

SESSION_COOKIE = "session_id"

print("Environment variables loaded:")
for key, value in env_vars.items():
    print(f"{key}: {value}")

if error:
    sys.exit()
