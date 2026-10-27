"""Notification validation and transactional failure propagation."""

import asyncio
from typing import cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.notificationAccess import NotificationAccess
from core.framework.notification import (
    APPLICATION_MESSAGE_NOTIFICATION,
    Notification,
    NotificationEvent,
)
from core.responses.notificationResponses import NotificationDestination, NotificationReplacement
from result import Result, ResultCode


@pytest.mark.parametrize(
    "path", ["//example.com", "/\\example.com", "https://example.com", "/a\nb", "/a b"]
)
def test_destination_rejects_external_and_ambiguous_paths(path: str) -> None:
    with pytest.raises(ValidationError):
        NotificationDestination(path=path)


@pytest.mark.parametrize("keys", [[], ["OTHER"], ["MESSAGE", "MESSAGE"]])
def test_invalid_replacements_never_deliver(keys: list[str]) -> None:
    session = cast(AsyncSession, MagicMock(spec=AsyncSession))
    with patch.object(NotificationAccess, "deliver_async", new_callable=AsyncMock) as deliver:
        result = asyncio.run(
            Notification.emit_async(
                session,
                APPLICATION_MESSAGE_NOTIFICATION,
                [NotificationReplacement(key=key, value="text") for key in keys],
            )
        )
    assert result.code() == ResultCode.BAD_REQUEST
    deliver.assert_not_awaited()


def test_unregistered_event_never_delivers() -> None:
    session = cast(AsyncSession, MagicMock(spec=AsyncSession))
    event = NotificationEvent(
        key="APPLICATION_MESSAGE", label_key="OTHER", message_key="OTHER", replacement_keys=()
    )
    result = asyncio.run(Notification.emit_async(session, event, []))
    assert result.code() == ResultCode.BAD_REQUEST


def test_failed_dispatch_rolls_back_savepoint_and_preserves_trace() -> None:
    session = MagicMock(spec=AsyncSession)
    transaction = AsyncMock()
    session.begin_nested.return_value.__aenter__ = AsyncMock(return_value=transaction)
    session.begin_nested.return_value.__aexit__ = AsyncMock(return_value=False)
    failed = Result[int](ResultCode.GENERAL_ERROR, "Storage failed")
    with patch.object(
        NotificationAccess, "deliver_async", new_callable=AsyncMock, return_value=failed
    ):
        result = asyncio.run(
            Notification.emit_async(
                cast(AsyncSession, session),
                APPLICATION_MESSAGE_NOTIFICATION,
                [NotificationReplacement(key="MESSAGE", value="hello")],
            )
        )
    assert result.code() == failed.code()
    assert result.message() == failed.message()
    transaction.rollback.assert_awaited_once()
    session.commit.assert_not_called()


def test_personal_events_cannot_broadcast_without_a_recipient() -> None:
    from core.framework.notification import DOWNLOAD_COMPLETED_NOTIFICATION

    session = cast(AsyncSession, MagicMock(spec=AsyncSession))
    with patch.object(NotificationAccess, "deliver_async", new_callable=AsyncMock) as deliver:
        result = asyncio.run(
            Notification.emit_async(
                session,
                DOWNLOAD_COMPLETED_NOTIFICATION,
                [NotificationReplacement(key="TITLE", value="Private track")],
            )
        )
    assert result.code() == ResultCode.BAD_REQUEST
    deliver.assert_not_awaited()


def test_delivery_filters_personal_subscribers_by_recipient() -> None:
    session = MagicMock(spec=AsyncSession)
    session.scalars = AsyncMock(return_value=[])
    session.flush = AsyncMock()
    result = asyncio.run(
        NotificationAccess.deliver_async(
            cast(AsyncSession, session),
            "DOWNLOAD_COMPLETED",
            "NOTIFICATION_DOWNLOAD_COMPLETED",
            [NotificationReplacement(key="TITLE", value="Private track")],
            recipient_user_id=42,
        )
    )
    assert result.is_ok() and result.result() == 0
    query = session.scalars.call_args.args[0]
    from sqlalchemy.dialects import postgresql

    compiled = query.compile(dialect=postgresql.dialect())
    assert compiled.params["user_id_1"] == 42
    assert compiled.params["event_key_1"] == "DOWNLOAD_COMPLETED"
    session.commit.assert_not_called()


def test_retried_downloads_keep_the_same_recipient_and_source_key() -> None:
    session = cast(AsyncSession, MagicMock(spec=AsyncSession))
    with patch.object(
        Notification, "emit_async", new_callable=AsyncMock, return_value=Result[int].ok(1)
    ) as emit:
        for _ in range(2):
            result = asyncio.run(
                Notification.download_async(session, 7, "download-id", 2, True, "Track")
            )
            assert result.is_ok()
    assert emit.await_args_list[0] == emit.await_args_list[1]
    assert emit.await_args is not None
    assert emit.await_args.kwargs["recipient_user_id"] == 7
    assert emit.await_args.kwargs["source_key"] == "download:download-id:DOWNLOAD_COMPLETED:2"
