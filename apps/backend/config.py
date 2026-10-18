"""Validated application settings shared by uv, Docker, CLI commands, and tests."""

import os
from pathlib import Path
from typing import Literal
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = os.environ.get("ROCKIT_ENV_FILE") or os.environ.get("ENV_FILE")
ENV_FILES = (
    [ENV_FILE] if ENV_FILE else [str(ROOT / ".env"), str(ROOT / "apps/backend/.env")]
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILES, extra="ignore")
    BACKEND_URL: str = "http://localhost:8000"
    CORS_URLS: str = "http://localhost:3000"
    PROD_WEB_SESSION_DOMAIN: str = "localhost"
    PROD_MOBILE_SESSION_DOMAIN: str = "localhost"
    SESSION_TOKEN_SECRET: str = Field(default="", min_length=32, repr=False)
    SESSION_COOKIE: str = "session_id"
    SESSION_DURATION: int = Field(default=3600, gt=0)
    SESSION_DURATION_REMEMBER_ME: int = Field(default=86400, gt=0)
    ENVIRONMENT: Literal["DEV", "PROD"] = "DEV"
    TEMP_PATH: str = "/tmp/rockit"
    LOGS_PATH: str = "/tmp/rockit/logs"
    LOG_DUMP_LEVEL: Literal["debug", "info", "warning", "error"] = "info"
    CONSOLE_DUMP_LEVEL: Literal["debug", "info", "warning", "error"] = "info"
    DOWNLOAD_THREADS: int = Field(default=2, ge=1)
    CLIENT_ID: str = ""
    CLIENT_SECRET: str = Field(default="", repr=False)
    YOUTUBE_API_KEY: str = Field(default="", repr=False)
    YTDLP_POT_PROVIDER_URL: str | None = None
    YTDLP_COOKIES_FILE: str | None = None
    YTDLP_PROXIES: str = Field(default="", repr=False)
    YTDLP_SOURCE_ADDRESS: str | None = None
    YTDLP_RATE_LIMIT_BYTES: int = Field(default=0, ge=0)
    YOUTUBE_MIN_REQUEST_INTERVAL_SECONDS: float = Field(default=3.0, ge=0)
    YOUTUBE_BLOCK_THRESHOLD: int = Field(default=5, ge=1)
    YOUTUBE_COOLDOWN_SECONDS: float = Field(default=900.0, ge=0)
    DB_HOST: str = "localhost"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = Field(default="", repr=False)
    DB_PORT: int = Field(default=5432, gt=0, le=65535)
    DB_NAME: str = "rockit"
    DB_IAM_AUTH: bool = False
    DB_REGION: str | None = None
    DB_SSLMODE: Literal["disable", "require", "verify-full"] | None = None
    DB_SSLROOTCERT: str | None = None
    S3_PRIVATE_ENDPOINT_URL: str | None = None
    S3_PUBLIC_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY: str | None = Field(default=None, repr=False)
    S3_SECRET_KEY: str | None = Field(default=None, repr=False)
    S3_BUCKET: str = "rockit"
    S3_REGION: str = "us-east-1"
    S3_PRESIGNED_URL_EXPIRES: int = Field(default=3600, ge=1, le=604800)

    @model_validator(mode="after")
    def validate_database(self):
        if self.DB_IAM_AUTH and not self.DB_REGION:
            raise ValueError("DB_REGION is required for IAM authentication")
        if self.DB_IAM_AUTH and self.DB_SSLMODE == "disable":
            raise ValueError("IAM requires TLS")
        if bool(self.S3_ACCESS_KEY) != bool(self.S3_SECRET_KEY):
            raise ValueError(
                "Configure both S3 credentials or use the AWS credential chain"
            )
        return self


settings = Settings()
