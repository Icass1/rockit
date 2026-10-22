"""Hermetic backend imports: tests never load deployment credentials or start services."""

import os
import re
from pathlib import Path

# constants.py otherwise loads .env and exits before tests can collect.
os.environ["ROCKIT_ENV_FILE"] = "/tmp/rockit-pytest-no-env"
source = Path("backend/constants.py").read_text()
for name in re.findall(r'get_env_(?:str|int)\(\s*"([A-Z_]+)"', source):
    os.environ[name] = "test"
for name in re.findall(r'get_env_int\("([A-Z_]+)"', source):
    os.environ[name] = "1"
os.environ.update(
    ENVIRONMENT="DEV",
    LOG_DUMP_LEVEL="error",
    CONSOLE_DUMP_LEVEL="error",
    LOGS_PATH="/tmp/rockit-test-logs",
    BACKEND_URL="http://test",
    DB_PORT="5432",
    SESSION_TOKEN_SECRET="test-only-signing-key-with-at-least-32-bytes",
)
