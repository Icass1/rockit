from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.notificationAccess import NotificationAccess
from backend.core.access.vocabularyAccess import VocabularyAccess
from backend.core.responses.notificationsResponse import (
    NotificationResponse,
    NotificationsResponse,
)
from backend.core.requests.notificationRequest import (
    NotificationActivityRequest,
    LegacyNotificationsRequest,
)

logger = getLogger(__name__)

# Published announcements belong to the server. Event keys are immutable.
RELEASE_VERSION = "2.0.0"


class Notifications:
    @staticmethod
    async def _ensure_release_async(
        session: AsyncSession, user_id: int
    ) -> AResult[bool]:
        """Ensure the canonical announcement exists before importing browser history."""
        version = RELEASE_VERSION
        result = await NotificationAccess.create_async(
            session=session,
            user_id=user_id,
            event_key=f"release:{version}",
            type=1,
            category="release",
            message=f"RockIt! v{version}",
            message_key="NOTIFICATIONS_RELEASE_TITLE",
            detail_key="NOTIFICATIONS_RELEASE_DETAIL",
        )
        if result.is_not_ok():
            logger.error(f"Cannot create release notification: {result.info()}")
        return result

    @staticmethod
    async def list_async(
        session: AsyncSession, user_id: int, lang_id: int
    ) -> AResult[NotificationsResponse]:
        """Load this user's inbox and resolve copy using the central vocabulary."""
        created = await Notifications._ensure_release_async(
            session=session, user_id=user_id
        )
        if created.is_not_ok():
            logger.error(f"Cannot create release notification: {created.info()}")
            return AResult(code=created.code(), message=created.message())
        rows = await NotificationAccess.list_async(session=session, user_id=user_id)
        if rows.is_not_ok():
            logger.error(f"Cannot load notifications: {rows.info()}")
            return AResult(code=rows.code(), message=rows.message())
        vocabulary = await VocabularyAccess.get_vocabulary_dict_by_lang_id(
            session=session, lang_id=lang_id
        )
        if vocabulary.is_not_ok():
            logger.error(f"Cannot load notification vocabulary: {vocabulary.info()}")
            return AResult(code=vocabulary.code(), message=vocabulary.message())
        translations = vocabulary.result()
        items: list[NotificationResponse] = []
        for row in rows.result():
            title = (
                translations.get(row.message_key, row.message_key)
                if row.message_key
                else row.message
            )
            if row.category == "release" and row.message_key:
                title = f"{row.message} · {title}"
            detail = (
                translations.get(row.detail_key, row.detail_key)
                if row.detail_key
                else row.detail
            )
            items.append(
                NotificationResponse(
                    id=row.public_id,
                    message=title or "",
                    type=row.type,
                    category=row.category,
                    createdAt=int(row.date_added.timestamp() * 1000),
                    read=row.read,
                    key=row.event_key,
                    detail=detail,
                )
            )
        return AResult(
            code=AResultCode.OK, message="OK", result=NotificationsResponse(items=items)
        )

    @staticmethod
    async def activity_async(
        session: AsyncSession, user_id: int, payload: NotificationActivityRequest
    ) -> AResult[bool]:
        """Record personal UI activity; clients cannot publish releases or download results."""
        result = await NotificationAccess.create_async(
            session=session,
            user_id=user_id,
            event_key=f"activity:{payload.key}",
            type=payload.type,
            category="activity",
            message=payload.message,
            detail=payload.detail,
        )
        if result.is_not_ok():
            logger.error(f"Cannot record activity: {result.info()}")
        return result

    @staticmethod
    async def social_async(
        session: AsyncSession,
        user_id: int,
        event_key: str,
        message: str,
        detail: str | None = None,
    ) -> AResult[bool]:
        """Persist a recipient-owned friend or share notification once."""
        result = await NotificationAccess.create_async(
            session=session,
            user_id=user_id,
            event_key=event_key,
            type=1,
            category="activity",
            message=message,
            detail=detail,
        )
        if result.is_not_ok():
            logger.error(f"Cannot record social notification: {result.info()}")
        return result

    @staticmethod
    async def mark_read_async(
        session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> AResult[bool]:
        """Persist the read state for this user only."""
        result = await NotificationAccess.mark_read_async(
            session=session, user_id=user_id, public_ids=public_ids
        )
        if result.is_not_ok():
            logger.error(f"Cannot mark notifications read: {result.info()}")
        return result

    @staticmethod
    async def download_async(
        session: AsyncSession,
        user_id: int,
        public_id: str,
        retry_count: int,
        success: bool,
        title: str,
    ) -> AResult[bool]:
        """Persist a terminal download event even when no browser is connected."""
        status = "COMPLETED" if success else "FAILED"
        result = await NotificationAccess.create_async(
            session=session,
            user_id=user_id,
            event_key=f"download:{public_id}:{status}:{retry_count}",
            type=3 if success else 0,
            category="download",
            message_key=(
                "NOTIFICATIONS_DOWNLOAD_DONE"
                if success
                else "NOTIFICATIONS_DOWNLOAD_FAILED"
            ),
            detail=title[:2000],
        )
        if result.is_not_ok():
            logger.error(f"Cannot record download notification: {result.info()}")
        return result

    @staticmethod
    async def import_async(
        session: AsyncSession,
        user_id: int,
        operation_id: str,
        success: bool,
        title: str,
    ) -> AResult[bool]:
        """Record the server's upload result."""
        result = await NotificationAccess.create_async(
            session=session,
            user_id=user_id,
            event_key=f"import:{operation_id}",
            type=3 if success else 0,
            category="import",
            message_key=(
                "NOTIFICATIONS_IMPORT_DONE"
                if success
                else "NOTIFICATIONS_IMPORT_FAILED"
            ),
            detail=title[:2000],
        )
        if result.is_not_ok():
            logger.error(f"Cannot record import notification: {result.info()}")
        return result

    @staticmethod
    async def migrate_legacy_async(
        session: AsyncSession, user_id: int, payload: LegacyNotificationsRequest
    ) -> AResult[bool]:
        """Move this account's retained browser history to its server inbox."""
        release = await Notifications._ensure_release_async(
            session=session, user_id=user_id
        )
        if release.is_not_ok():
            logger.error(f"Cannot prepare notification migration: {release.info()}")
            return AResult(code=release.code(), message=release.message())
        result = await NotificationAccess.migrate_legacy_async(
            session=session, user_id=user_id, items=payload.items
        )
        if result.is_not_ok():
            logger.error(f"Cannot migrate browser notifications: {result.info()}")
        return result
