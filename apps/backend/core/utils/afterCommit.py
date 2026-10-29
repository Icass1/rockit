"""Request/WS transaction callbacks: discard on rollback, run after successful commit."""

from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from logger import getLogger

logger = getLogger(__name__)


def after_commit(session: AsyncSession, callback: Callable[[], Awaitable[None]]) -> None:
    callbacks: list[Callable[[], Awaitable[None]]] = session.info.setdefault("after_commit", [])
    callbacks.append(callback)


async def run_after_commit(session: AsyncSession) -> None:
    callbacks: list[Callable[[], Awaitable[None]]] = session.info.pop("after_commit", [])
    for callback in callbacks:
        try:
            await callback()
        except Exception:
            logger.exception("Post-commit notification failed")
