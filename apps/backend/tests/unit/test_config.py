from typing import Any
import pytest
from pydantic import ValidationError
from backend.config import Settings


@pytest.mark.parametrize(
    "overrides",
    [
        {"DB_IAM_AUTH": True, "DB_REGION": None},
        {"DB_IAM_AUTH": True, "DB_REGION": "eu-west-1", "DB_SSLMODE": "disable"},
        {"S3_ACCESS_KEY": "test", "S3_SECRET_KEY": None},
        {"S3_PRESIGNED_URL_EXPIRES": 604801},
        {"SESSION_TOKEN_SECRET": "too-short"},
        {"DOWNLOAD_THREADS": 0},
    ],
)
def test_invalid_runtime_configuration_fails_early(overrides: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        Settings(**overrides)
