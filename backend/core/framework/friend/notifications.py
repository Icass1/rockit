"""Deliver social invalidations only after the request transaction commits."""

from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.utils.afterCommit import after_commit
from backend.utils.logger import getLogger

logger = getLogger(__name__)


def notify_after_commit(
    session: AsyncSession, user_ids: list[int], kind: str = "social_changed"
) -> None:
    if "social_events" not in session.info:
        session.info["social_events"] = set()
        after_commit(session, lambda: deliver_notifications(session))
    events: set[tuple[int, str]] = session.info["social_events"]
    events.update((user_id, kind) for user_id in user_ids)


async def deliver_notifications(session: AsyncSession) -> None:
    from backend.core.framework.websocket.webSocketManager import ws_manager

    events: set[tuple[int, str]] = session.info.pop("social_events", set())
    for user_id, kind in events:
        try:
            await ws_manager.send_to_user_async(user_id=user_id, message={"type": kind})
        except Exception:
            logger.exception("Unable to deliver social update for user %s", user_id)
