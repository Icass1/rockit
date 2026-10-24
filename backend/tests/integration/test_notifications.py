"""Exercise the inbox against disposable PostgreSQL databases."""

from datetime import datetime, timezone

import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.db.ormModels.notification import NotificationRow
from backend.core.access.db.ormModels.vocabulary import VocabularyRow
from backend.core.access.notificationAccess import NotificationAccess
from backend.core.framework.notifications import Notifications
from backend.core.requests.notificationRequest import (
    LegacyNotificationRequest,
    LegacyNotificationsRequest,
)

pytestmark = pytest.mark.integration


async def test_terminal_events_persist_without_a_browser_and_deduplicate(
    database: AsyncSession,
) -> None:
    for _ in range(2):
        result = await Notifications.download_async(
            session=database,
            user_id=1,
            public_id="download",
            retry_count=0,
            success=True,
            title="Album track",
        )
        assert result.is_ok()
    await database.commit()
    result = await NotificationAccess.list_async(session=database, user_id=1)
    assert result.is_ok()
    assert len(result.result()) == 1
    row = result.result()[0]
    assert row.message_key == "NOTIFICATIONS_DOWNLOAD_DONE"
    assert row.detail == "Album track"
    assert not row.read
    other = await NotificationAccess.list_async(session=database, user_id=2)
    assert other.is_ok() and other.result() == []


async def test_read_receipts_are_owned_and_retained(database: AsyncSession) -> None:
    created = await Notifications.import_async(
        session=database,
        user_id=1,
        operation_id="upload",
        success=False,
        title="Album",
    )
    assert created.is_ok()
    rows = await NotificationAccess.list_async(session=database, user_id=1)
    assert rows.is_ok()
    public_id = rows.result()[0].public_id
    result = await Notifications.mark_read_async(
        session=database, user_id=2, public_ids=[public_id]
    )
    assert result.is_ok()
    await database.commit()
    database.expire_all()
    rows = await NotificationAccess.list_async(session=database, user_id=1)
    assert rows.is_ok() and not rows.result()[0].read
    result = await Notifications.mark_read_async(
        session=database, user_id=1, public_ids=[public_id]
    )
    assert result.is_ok()
    await database.commit()
    database.expire_all()
    rows = await NotificationAccess.list_async(session=database, user_id=1)
    assert rows.is_ok() and len(rows.result()) == 1 and rows.result()[0].read


async def test_release_is_server_owned_translated_and_does_not_reset_read(
    database: AsyncSession,
) -> None:
    await database.execute(
        insert(VocabularyRow).values(
            [
                dict(lang_id=1, key="NOTIFICATIONS_RELEASE_TITLE", value="News"),
                dict(
                    lang_id=1,
                    key="NOTIFICATIONS_RELEASE_DETAIL",
                    value="Release details",
                ),
            ]
        )
    )
    result = await Notifications.list_async(session=database, user_id=1, lang_id=1)
    assert result.is_ok()
    item = result.result().items[0]
    assert item.message == "RockIt! v2.0.0 · News"
    assert item.detail == "Release details"
    assert isinstance(item.id, str)
    read = await Notifications.mark_read_async(
        session=database, user_id=1, public_ids=[item.id]
    )
    assert read.is_ok()
    await database.commit()
    database.expire_all()
    reloaded = await Notifications.list_async(session=database, user_id=1, lang_id=1)
    assert reloaded.is_ok()
    assert len(reloaded.result().items) == 1 and reloaded.result().items[0].read


async def test_legacy_import_is_idempotent_and_never_resets_read(
    database: AsyncSession,
) -> None:
    item = LegacyNotificationRequest(
        id=1,
        message="Old notification",
        type=1,
        category="activity",
        createdAt=int(datetime.now(timezone.utc).timestamp() * 1000),
        read=True,
    )
    result = await Notifications.migrate_legacy_async(
        session=database,
        user_id=1,
        payload=LegacyNotificationsRequest(items=[item, item]),
    )
    assert result.is_ok()
    item.read = False
    again = await Notifications.migrate_legacy_async(
        session=database,
        user_id=1,
        payload=LegacyNotificationsRequest(items=[item]),
    )
    assert again.is_ok()
    await database.commit()
    database.expire_all()
    rows = await NotificationAccess.list_async(session=database, user_id=1)
    assert rows.is_ok()
    legacy = [row for row in rows.result() if row.category == "activity"]
    assert len(legacy) == 1 and legacy[0].read


async def test_legacy_release_preserves_existing_server_copy_and_read(
    database: AsyncSession,
) -> None:
    release = await Notifications.list_async(session=database, user_id=1, lang_id=1)
    assert release.is_ok()
    item = LegacyNotificationRequest(
        id=1,
        message="Older translated copy",
        type=1,
        category="release",
        createdAt=1,
        read=True,
        key="release:2.0.0",
    )
    migrated = await Notifications.migrate_legacy_async(
        session=database,
        user_id=1,
        payload=LegacyNotificationsRequest(items=[item]),
    )
    assert migrated.is_ok()
    await database.commit()
    database.expire_all()
    rows = await NotificationAccess.list_async(session=database, user_id=1)
    assert rows.is_ok()
    assert len(rows.result()) == 1
    row: NotificationRow = rows.result()[0]
    assert row.read and row.message_key == "NOTIFICATIONS_RELEASE_TITLE"


async def test_notification_failure_does_not_rollback_the_operation(
    database: AsyncSession,
) -> None:
    saved = await NotificationAccess.create_async(
        session=database,
        user_id=1,
        event_key="valid",
        type=1,
        category="activity",
        message="Existing operation",
    )
    assert saved.is_ok()
    failed = await NotificationAccess.create_async(
        session=database,
        user_id=1,
        event_key="invalid",
        type=1,
        category="activity",
        message="x" * 2001,
    )
    assert failed.is_not_ok()
    await database.commit()
    rows = await NotificationAccess.list_async(session=database, user_id=1)
    assert rows.is_ok()
    assert [row.event_key for row in rows.result()] == ["valid"]
