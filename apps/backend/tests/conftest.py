"""Service-free defaults for PR tests, explicit settings for real-service system tests."""

import os
import sys
import tempfile
from pathlib import Path

import pytest

from tests.fake_object_store import FakeObjectStore

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))


def pytest_configure(config: object) -> None:
    """Keep deployment configuration out of fast tests and preserve system-test settings."""
    if any("system_tests" in str(arg) for arg in getattr(config, "args", [])):
        return
    os.environ["ENV_FILE"] = "/tmp/rockit-pytest-no-env"
    os.environ["ROCKIT_ENV_FILE"] = os.environ["ENV_FILE"]
    defaults = {
        "BACKEND_URL": "http://test",
        "CORS_URLS": "http://test",
        "SESSION_DURATION": "3600",
        "SESSION_DURATION_REMEMBER_ME": "86400",
        "PROD_WEB_SESSION_DOMAIN": "localhost",
        "PROD_MOBILE_SESSION_DOMAIN": "localhost",
        "TEMP_PATH": "/tmp/rockit-test-temp",
        "DOWNLOAD_THREADS": "1",
        "CLIENT_ID": "test",
        "CLIENT_SECRET": "test",
        "YOUTUBE_API_KEY": "test",
        "DB_HOST": "localhost",
        "DB_USER": "test",
        "DB_PASSWORD": "test",
        "DB_NAME": "unused_test_database",
        "S3_PRIVATE_ENDPOINT_URL": "http://localhost:9000",
        "S3_PUBLIC_ENDPOINT_URL": "http://localhost:9000",
        "S3_ACCESS_KEY": "test",
        "S3_SECRET_KEY": "test-only-storage-key",
        "S3_BUCKET": "rockit-test",
    }
    os.environ.update(defaults)
    os.environ.update(
        ENVIRONMENT="DEV",
        LOG_DUMP_LEVEL="error",
        CONSOLE_DUMP_LEVEL="error",
        LOGS_PATH=tempfile.mkdtemp(prefix="rockit-test-logs-"),
        BACKEND_URL="http://test",
        DB_PORT="5432",
        SESSION_TOKEN_SECRET="test-only-signing-key-with-at-least-32-bytes",
    )


@pytest.fixture
def object_store(monkeypatch: pytest.MonkeyPatch) -> FakeObjectStore:
    from core.framework import objectFiles

    store = FakeObjectStore()
    monkeypatch.setattr(objectFiles, "get_s3_client", lambda: store)
    return store
