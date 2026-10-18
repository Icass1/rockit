"""Notification validation and transactional failure propagation."""

import asyncio
from typing import cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.notificationAccess import NotificationAccess
from backend.core.framework.notification import (
    APPLICATION_MESSAGE_NOTIFICATION,
    Notification,
    NotificationEvent,
)
from backend.core.responses.notificationResponses import (
    NotificationDestination,
    NotificationReplacement,
)
from backend.core.aResult import AResult as Result, AResultCode as ResultCode


@pytest.mark.parametrize(
    "path", ["//example.com", "/\\example.com", "https://example.com", "/a\nb", "/a b"]
)
def test_destination_rejects_external_and_ambiguous_paths(path: str) -> None:
    with pytest.raises(ValidationError):
        NotificationDestination(path=path)


@pytest.mark.parametrize("keys", [[], ["OTHER"], ["MESSAGE", "MESSAGE"]])
def test_invalid_replacements_never_deliver(keys: list[str]) -> None:
    session = cast(AsyncSession, MagicMock(spec=AsyncSession))
    with patch.object(
        NotificationAccess, "deliver_async", new_callable=AsyncMock
    ) as deliver:
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
        key="APPLICATION_MESSAGE",
        label_key="OTHER",
        message_key="OTHER",
        replacement_keys=(),
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
