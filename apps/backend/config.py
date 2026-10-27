import os
import sys
from typing import Annotated, Literal

from pydantic import Field, ValidationError, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            [os.environ["ENV_FILE"]]
            if "ENV_FILE" in os.environ
            else [
                os.environ.get("ROCKIT_ENV_FILE", ".env"),
                "apps/backend/.env",
                ".env.production",
                ".dockerenv",
            ]
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Strings
    BACKEND_URL: str
    CORS_URLS: str
    PROD_WEB_SESSION_DOMAIN: str
    PROD_MOBILE_SESSION_DOMAIN: str
    LOGS_PATH: str
    DB_HOST: str
    DB_USER: str
    DB_PASSWORD: str = ""
    DB_IAM_AUTH: bool = False
    DB_REGION: str | None = None
    DB_SSLMODE: Literal["disable", "require", "verify-full"] | None = None
    DB_SSLROOTCERT: str | None = None
    DB_NAME: str

    # Integers
    SESSION_DURATION: int
    SESSION_DURATION_REMEMBER_ME: int
    DB_PORT: int

    # Constrained strings
    ENVIRONMENT: Literal["DEV", "PROD"]
    LOG_DUMP_LEVEL: Literal["debug", "info", "warning", "error"]
    CONSOLE_DUMP_LEVEL: Literal["debug", "info", "warning", "error"]

    # Defaults (override via env if needed)
    SESSION_COOKIE: str = "session_id"
    CHUNK_SIZE: int = 1024 * 1024

    # Object storage (S3-compatible, e.g. MinIO / AWS S3)
    # S3-compatible endpoint used by backend-to-storage operations.
    S3_PRIVATE_ENDPOINT_URL: str | None = None
    # Endpoint embedded in presigned URLs returned to clients. This must be
    # reachable by clients; it may be different from the private endpoint.
    S3_PUBLIC_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY: str | None = None
    S3_SECRET_KEY: str | None = None
    S3_BUCKET: str = Field(min_length=1)
    S3_REGION: str = "us-east-1"
    # Objects are private; all access happens through short-lived presigned URLs.
    # Lifetime of a generated presigned URL, in seconds.
    S3_PRESIGNED_URL_EXPIRES: int = 3600

    # Rockit capabilities extend the same shared Settings used by the template.
    TEMP_PATH: str
    DOWNLOAD_THREADS: int
    CLIENT_ID: str
    CLIENT_SECRET: str
    LASTFM_API_KEY: str = ""
    YOUTUBE_API_KEY: str
    SESSION_TOKEN_SECRET: str = Field(min_length=32)
    RECOMMENDATION_PREFETCH_MAX_PENDING: int = Field(default=2, ge=0)
    RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS: float = 5.0
    RECOMMENDATION_EXTERNAL_CACHE_HOURS: float = 24.0
    YTDLP_POT_PROVIDER_URL: str | None = None
    YTDLP_COOKIES_FILE: str | None = None
    YTDLP_PROXIES: Annotated[list[str], NoDecode] = Field(default_factory=list)
    YTDLP_SOURCE_ADDRESS: str | None = None
    YTDLP_RATE_LIMIT_BYTES: int = 0
    YOUTUBE_MIN_REQUEST_INTERVAL_SECONDS: float = 3.0
    YOUTUBE_BLOCK_THRESHOLD: int = 5
    YOUTUBE_COOLDOWN_SECONDS: float = 900.0

    @field_validator("YTDLP_PROXIES", mode="before")
    @classmethod
    def parse_proxy_list(cls, value: object) -> object:
        """Preserve Rockit's comma-separated proxy configuration."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator(
        "S3_PRIVATE_ENDPOINT_URL",
        "S3_PUBLIC_ENDPOINT_URL",
        "S3_ACCESS_KEY",
        "S3_SECRET_KEY",
        "YTDLP_POT_PROVIDER_URL",
        "YTDLP_COOKIES_FILE",
        "YTDLP_SOURCE_ADDRESS",
        mode="before",
    )
    @classmethod
    def optional_download_setting(cls, value: object) -> object:
        """Treat blank optional downloader settings as absent."""
        return None if isinstance(value, str) and not value.strip() else value

    @model_validator(mode="after")
    def validate_database_authentication(self) -> "Settings":
        """Reject incomplete or insecure database authentication settings."""

        if self.DB_IAM_AUTH:
            if not self.DB_REGION:
                raise ValueError("DB_REGION is required when DB_IAM_AUTH is enabled")
            if self.DB_SSLMODE == "disable":
                raise ValueError("IAM database authentication requires TLS")
        elif not self.DB_PASSWORD:
            raise ValueError("DB_PASSWORD is required when DB_IAM_AUTH is disabled")
        if self.DB_SSLROOTCERT and self.DB_SSLMODE != "verify-full":
            raise ValueError("DB_SSLROOTCERT requires DB_SSLMODE=verify-full")
        return self


try:
    # Fields are loaded from the environment at runtime.
    settings = Settings()  # type: ignore[call-arg]
except ValidationError as e:
    print(f"Configuration error:\n{e}", file=sys.stderr)
    exit(1)
