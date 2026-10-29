import os
import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

    from sqlalchemy.ext.asyncio import AsyncSession

    from core.access.db.database import Database as Database

    db_context: Database
    add_default_images: Callable[[AsyncSession], Awaitable[None]]
    add_initial_content_async: Callable[[], Awaitable[None]]
sys.path.append("apps/backend")
sys.path.append("apps")
sys.path.append(".")

if __name__ == "apps.backend.core" and "core" not in sys.modules:
    sys.modules["core"] = sys.modules[__name__]
elif __name__ == "backend.core" and "apps.backend.core" not in sys.modules:
    sys.modules["apps.backend.core"] = sys.modules[__name__]
    sys.modules.setdefault("core", sys.modules[__name__])
elif __name__ == "core" and "apps.backend.core" not in sys.modules:
    sys.modules["apps.backend.core"] = sys.modules[__name__]

_STARTUP_TEXT_ENV_KEY: str = "CORE_STARTUP_TEXT_PRINTED"


def print_startup_text() -> None:
    """Print the startup banner exactly once per process.

    ``core`` is imported under several module names (``core``,
    ``apps.backend.core``, ``backend.core``) because the codebase mixes
    ``sys.path`` manipulation with package-qualified imports. Module-level
    state is not shared between those identities, so use a process-wide flag.
    """

    if os.environ.get(_STARTUP_TEXT_ENV_KEY):
        return

    os.environ[_STARTUP_TEXT_ENV_KEY] = "1"

    from logger import logger

    logger.info("BANNER")


def __getattr__(name: str) -> object:
    """Load application startup helpers only when the application requests them."""
    if name in {"db_context", "add_default_images"}:
        from core.access.db import db_context
        from core.initial_data import add_default_images

        return db_context if name == "db_context" else add_default_images
    if name == "add_initial_content_async":
        from core.access.db import db_context
        from core.initial_data import add_initial_reference_data_async

        async def add_initial_content_async() -> None:
            """Seed required reference content during application startup."""
            async with db_context.session_scope_async() as session:
                await add_initial_reference_data_async(session=session)

        return add_initial_content_async
    raise AttributeError(name)


print_startup_text()
