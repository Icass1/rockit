import asyncio
import ssl
from unittest.mock import MagicMock
import pytest
from backend.core.access.db import authentication, database


def test_iam_uses_fresh_tokens_and_redacts_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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


def test_password_url_handles_special_characters(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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


def test_verify_full_uses_certificate_verification(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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
