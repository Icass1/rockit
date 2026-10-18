"""Tests never read deployment configuration or start services implicitly."""

import os

os.environ["ROCKIT_ENV_FILE"] = "/tmp/rockit-pytest-no-env"
os.environ.update(
    ENVIRONMENT="DEV",
    LOG_DUMP_LEVEL="error",
    CONSOLE_DUMP_LEVEL="error",
    LOGS_PATH="/tmp/rockit-test-logs",
    BACKEND_URL="http://test",
    DB_HOST="localhost",
    DB_USER="postgres",
    DB_NAME="rockit-test",
    DB_PORT="5432",
    DB_PASSWORD="test",
    SESSION_TOKEN_SECRET="test-only-signing-key-with-at-least-32-bytes",
)
