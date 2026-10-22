"""Backend unit tests.

Run from the repository root:

    venv/bin/python -m unittest discover -s tests -t .

backend.constants aborts when required environment variables are missing,
so safe placeholders are set here before any backend module is imported.
No test talks to a real database or to the network.
"""

import os
import tempfile

_TEST_ENV: dict[str, str] = {
    "BACKEND_URL": "http://localhost:8000",
    "CORS_URLS": "http://localhost:3000",
    "SESSION_DURATION": "3600",
    "SESSION_TOKEN_SECRET": "rockit-unit-tests-placeholder-0123456789",
    "SESSION_DURATION_REMEMBER_ME": "3600",
    "PROD_WEB_SESSION_DOMAIN": "localhost",
    "PROD_MOBILE_SESSION_DOMAIN": "localhost",
    "ENVIRONMENT": "DEV",
    "MEDIA_PATH": tempfile.gettempdir(),
    "IMAGES_PATH": tempfile.gettempdir(),
    "TEMP_PATH": tempfile.gettempdir(),
    "LOGS_PATH": tempfile.mkdtemp(prefix="rockit-test-logs-"),
    "LOG_DUMP_LEVEL": "error",
    "CONSOLE_DUMP_LEVEL": "error",
    "DOWNLOAD_THREADS": "1",
    "BUILDS_PATH": tempfile.gettempdir(),
    "CLIENT_ID": "test",
    "CLIENT_SECRET": "test",
    "YOUTUBE_API_KEY": "test",
    "DB_HOST": "localhost",
    "DB_USER": "test",
    "DB_PASSWORD": "test",
    "DB_PORT": "5432",
    "DB_NAME": "test",
    # External providers must never be reachable from tests.
    "LISTENBRAINZ_API_URL": "https://listenbrainz.invalid",
    "LASTFM_API_KEY": "",
}

# Point the env-file loader at a file that does not exist so a developer's
# real .env never leaks into tests.
os.environ["ROCKIT_ENV_FILE"] = os.path.join(
    tempfile.gettempdir(), "rockit-tests-no-env-file"
)
for _name, _value in _TEST_ENV.items():
    os.environ[_name] = _value
