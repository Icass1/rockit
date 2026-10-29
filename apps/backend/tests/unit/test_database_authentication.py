"""Tests for database authentication configuration and token generation."""

import asyncio
import ssl
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError

from config import Settings, settings  # noqa: E402
from core.access.db import (
    authentication,
    database,  # noqa: E402
)

BACKEND_ROOT = Path(__file__).parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture(autouse=True)
def replace_connection_event_registration(monkeypatch: pytest.MonkeyPatch) -> None:
    """Unit tests replace engines, so their SQLAlchemy event target is also fake."""
    monkeypatch.setattr(database.event, "listen", MagicMock())


def test_iam_uses_fresh_tokens_and_redacts_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    """Each asyncpg password callback signs a token for the configured endpoint."""
    client = MagicMock()
    client.generate_db_auth_token.side_effect = ["first-token", "second-token"]
    factory = MagicMock(return_value=client)
    engine_factory = MagicMock()
    log = MagicMock()
    monkeypatch.setattr(authentication.boto3, "client", factory)
    monkeypatch.setattr(database, "create_async_engine", engine_factory)
    monkeypatch.setattr(database.logger, "info", log)

    database.Database(
        "postgres",
        "unused-secret",
        "cluster.rds.amazonaws.com",
        5432,
        "postgres",
        iam_auth=True,
        region="eu-south-2",
    )
    kwargs = engine_factory.call_args.kwargs
    assert kwargs["url"].password is None
    assert kwargs["connect_args"]["ssl"] == "require"
    callback = kwargs["connect_args"]["password"]
    assert factory.call_count == 0
    assert asyncio.run(callback()) == "first-token"
    assert asyncio.run(callback()) == "second-token"
    assert factory.call_count == 2
    factory.assert_called_with("rds", region_name="eu-south-2")
    client.generate_db_auth_token.assert_called_with(
        DBHostname="cluster.rds.amazonaws.com",
        Port=5432,
        DBUsername="postgres",
        Region="eu-south-2",
    )
    assert "unused-secret" not in str(log.call_args_list)
    assert "first-token" not in str(log.call_args_list)


def test_password_url_handles_special_characters(monkeypatch: pytest.MonkeyPatch) -> None:
    """Passwords retain URL punctuation and are hidden in connection logs."""
    engine_factory = MagicMock()
    log = MagicMock()
    monkeypatch.setattr(database, "create_async_engine", engine_factory)
    monkeypatch.setattr(database.logger, "info", log)
    password = "secret@:/?#%"
    database.Database("postgres", password, "localhost", 5432, "test")
    assert engine_factory.call_args.kwargs["url"].password == password
    assert engine_factory.call_args.kwargs["connect_args"] == {}
    assert password not in str(log.call_args_list)


def test_verify_full_uses_certificate_verification(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verified TLS checks both the certificate authority and hostname."""
    engine_factory = MagicMock()
    monkeypatch.setattr(database, "create_async_engine", engine_factory)
    database.Database(
        "postgres",
        "",
        "cluster.rds.amazonaws.com",
        5432,
        "postgres",
        iam_auth=True,
        region="eu-south-2",
        sslmode="verify-full",
    )
    context = engine_factory.call_args.kwargs["connect_args"]["ssl"]
    assert isinstance(context, ssl.SSLContext)
    assert context.check_hostname
    assert context.verify_mode == ssl.CERT_REQUIRED


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"DB_IAM_AUTH": True, "DB_REGION": None}, "DB_REGION"),
        ({"DB_IAM_AUTH": True, "DB_REGION": "eu-south-2", "DB_SSLMODE": "disable"}, "TLS"),
        ({"DB_IAM_AUTH": False, "DB_PASSWORD": ""}, "DB_PASSWORD"),
        ({"DB_SSLROOTCERT": "/tmp/ca.pem", "DB_SSLMODE": "require"}, "verify-full"),
    ],
)
def test_settings_reject_invalid_authentication(overrides: dict[str, object], message: str) -> None:
    """Incomplete authentication and TLS configuration fails at startup."""
    values = settings.model_dump() | overrides
    with pytest.raises(ValidationError, match=message):
        Settings.model_validate(values)


def test_iam_settings_do_not_require_a_password(monkeypatch: pytest.MonkeyPatch) -> None:
    """IAM configuration accepts an omitted password."""
    values = settings.model_dump() | {"DB_IAM_AUTH": True, "DB_REGION": "eu-south-2"}
    values.pop("DB_PASSWORD")
    monkeypatch.delenv("DB_PASSWORD", raising=False)
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    assert Settings.model_validate(values).DB_PASSWORD == ""


def test_token_failures_propagate(monkeypatch: pytest.MonkeyPatch) -> None:
    """An AWS failure cannot silently fall back to the configured password."""
    engine_factory = MagicMock()
    factory = MagicMock(side_effect=RuntimeError("AWS credentials unavailable"))
    monkeypatch.setattr(database, "create_async_engine", engine_factory)
    monkeypatch.setattr(authentication.boto3, "client", factory)
    database.Database(
        "postgres",
        "fallback-secret",
        "cluster.rds.amazonaws.com",
        5432,
        "postgres",
        iam_auth=True,
        region="eu-south-2",
    )
    callback = engine_factory.call_args.kwargs["connect_args"]["password"]
    with pytest.raises(RuntimeError, match="AWS credentials unavailable"):
        asyncio.run(callback())
