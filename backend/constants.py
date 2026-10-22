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


def get_env_str_optional(name: str, default: str | None = None) -> str | None:
    """Read an optional string variable. Never marks the environment as invalid."""

    var = os.getenv(name)
    if var is None or var.strip() == "":
        return default

    var = var.strip()
    env_vars[name] = var
    return var


def get_env_int_optional(name: str, default: int) -> int:
    """Read an optional integer variable, falling back to default when unusable."""

    var = get_env_str_optional(name)
    if var is None:
        return default

    try:
        value = int(var)
    except ValueError:
        print(f"Environment variable '{name}' must be a number, found '{var}'")
        return default

    env_vars[name] = value
    return value


def get_env_float_optional(name: str, default: float) -> float:
    """Read an optional float variable, falling back to default when unusable."""

    var = get_env_str_optional(name)
    if var is None:
        return default

    try:
        value = float(var)
    except ValueError:
        print(f"Environment variable '{name}' must be a number, found '{var}'")
        return default

    env_vars[name] = str(value)
    return value


def get_env_str_list_optional(name: str) -> List[str]:
    """Read an optional comma separated list variable."""

    var = get_env_str_optional(name)
    if var is None:
        return []

    return [item.strip() for item in var.split(",") if item.strip()]


BACKEND_URL = get_env_str("BACKEND_URL")
CORS_URLS = get_env_str("CORS_URLS", possible_values=None)
SESSION_DURATION = get_env_int("SESSION_DURATION")
SESSION_DURATION_REMEMBER_ME = get_env_int("SESSION_DURATION_REMEMBER_ME")
# Read directly so the signing key is never included in the environment dump.
SESSION_TOKEN_SECRET = os.getenv("SESSION_TOKEN_SECRET", "")
if len(SESSION_TOKEN_SECRET.encode("utf-8")) < 32:
    print("SESSION_TOKEN_SECRET must contain at least 32 bytes")
    error = True
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
# enables Last.fm discovery for every user through one server-side key.
# Shared admission budget, including queued and retrying automatic downloads.
# Set to zero to disable automatic preparation without disabling recommendations.
RECOMMENDATION_PREFETCH_MAX_PENDING = max(
    0, get_env_int_optional("RECOMMENDATION_PREFETCH_MAX_PENDING", 2)
)
# Last.fm API key (secret). When unset the Last.fm provider is disabled.
LASTFM_API_KEY = get_optional_env_str("LASTFM_API_KEY", default="")
# Per-request timeout for external providers, in seconds.
RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS = get_optional_env_float(
    "RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS", default=5.0
)
# How long successful external suggestions are reused before re-fetching.
RECOMMENDATION_EXTERNAL_CACHE_HOURS = get_optional_env_float(
    "RECOMMENDATION_EXTERNAL_CACHE_HOURS", default=24.0
)


# --- YouTube download reliability -------------------------------------------
# All of these are optional: with none of them set the downloader still works,
# it just runs with the built-in defaults (no PO tokens, no proxies, no
# cookies). See docs/YOUTUBE_DOWNLOADS.md for the deployment guide.

# Base URL of a bgutil PO token provider (e.g. "http://bgutil-provider:4416").
# Without it the PO-token strategies are skipped.
YTDLP_POT_PROVIDER_URL = get_env_str_optional("YTDLP_POT_PROVIDER_URL")

# Netscape cookies.txt exported from a logged-in YouTube account. Optional and
# risky (the account can get flagged), so it is the last strategy tried.
YTDLP_COOKIES_FILE = get_env_str_optional("YTDLP_COOKIES_FILE")

# Comma separated proxy URLs, rotated round-robin when YouTube blocks our IP.
# e.g. "http://user:pass@host:8080,socks5://host:1080"
YTDLP_PROXIES = get_env_str_list_optional("YTDLP_PROXIES")

# Local address yt-dlp binds to. With an IPv6 /64 this lets the host rotate its
# egress address out of a rate-limited one.
YTDLP_SOURCE_ADDRESS = get_env_str_optional("YTDLP_SOURCE_ADDRESS")

# Optional cap on download throughput in bytes/s (0 disables).
YTDLP_RATE_LIMIT_BYTES = get_env_int_optional("YTDLP_RATE_LIMIT_BYTES", 0)

# Minimum spacing between two YouTube extractions, in seconds. Jitter of up to
# 50% is added on top so the traffic does not look machine-timed.
YOUTUBE_MIN_REQUEST_INTERVAL_SECONDS = get_env_float_optional(
    "YOUTUBE_MIN_REQUEST_INTERVAL_SECONDS", 3.0
)

# Consecutive block-class failures before the circuit breaker opens.
YOUTUBE_BLOCK_THRESHOLD = get_env_int_optional("YOUTUBE_BLOCK_THRESHOLD", 5)

# How long the circuit breaker stays open once tripped, in seconds.
YOUTUBE_COOLDOWN_SECONDS = get_env_float_optional("YOUTUBE_COOLDOWN_SECONDS", 900.0)


DB_HOST = get_env_str("DB_HOST")
DB_USER = get_env_str("DB_USER")
DB_PASSWORD = get_env_str("DB_PASSWORD")
DB_PORT = get_env_int("DB_PORT")
DB_NAME = get_env_str("DB_NAME")

SESSION_COOKIE = "session_id"

print("Environment variables loaded:")
for key, value in env_vars.items():
    displayed_value = (
        "[configured]" if key in ("YTDLP_PROXIES", "YTDLP_POT_PROVIDER_URL") else value
    )
    print(f"{key}: {displayed_value}")

if error:
    sys.exit()
