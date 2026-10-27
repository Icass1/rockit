import asyncio
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from importlib import import_module
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from core.access.db import db_context
from core.framework import providers
from core.framework.downloader import downloads_manager
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.middlewares.requestLogMiddleware import RequestLogMiddleware
from logger import getLogger

os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["TERM"] = "xterm"
os.environ["COLUMNS"] = "120"


logger = getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize storage and reference data, then run and close shared services."""
    from core import add_initial_content_async

    try:
        await db_context.async_init()
    except Exception as e:
        logger.critical(f"Error initializing database: {e}")
        raise

    from core.framework.storage import Storage

    await Storage.ensure_bucket_async()
    await add_initial_content_async()

    await db_context.wait_for_session_local_async()

    # Provider health failures do not prevent the API from starting.
    for provider in providers.get_providers():
        health = await provider.check_health_async()
        if health.is_not_ok():
            logger.error(f"Provider {provider.get_name()} is not ready: {health.message()}")

    download_task = asyncio.create_task(
        downloads_manager.download_manager(), name="Download Manager"
    )
    # asyncio.create_task(telegram_bot_task(), name="Rockit Telegram Bot")

    try:
        yield
    finally:
        from core.framework.audio.silence import shutdown_bounds

        await shutdown_bounds()
        download_task.cancel()
        try:
            await download_task
        except asyncio.CancelledError:
            pass
        from core.framework.websocket.webSocketManager import ws_manager

        closed_sockets = await ws_manager.close_all_async()
        logger.info(f"Closed {closed_sockets} WebSocket connection(s) on shutdown.")


app = FastAPI(
    title="RockIt!",
    summary="The best music player in the world.",
    version="0.0.1",
    docs_url="/docs",
    lifespan=lifespan,
)

cors_origins: list[str] = []
if settings.CORS_URLS and settings.CORS_URLS != "NONE":
    cors_origins.extend([url.strip() for url in settings.CORS_URLS.split(",") if url.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(DBSessionMiddleware)
app.add_middleware(RequestLogMiddleware)

routers_included: int = 0

# Search and initialize all routers.
for dirpath, dirnames, filenames in os.walk(Path(__file__).resolve().parents[1]):
    if not dirpath.endswith("/controllers"):
        continue

    for file_name in filenames:
        if not file_name.endswith(".py"):
            continue

        if file_name == "__init__.py":
            continue

        module_name = file_name.replace(".py", "")

        module_path = Path(dirpath).relative_to(Path(__file__).resolve().parents[1])
        module = import_module(f"{'.'.join(module_path.parts)}.{module_name}")
        try:
            router_included = False
            public_router_included = False

            if hasattr(module, "router"):
                app.include_router(module.router)
                router_included = True

            if hasattr(module, "public_router"):
                app.include_router(module.public_router)
                public_router_included = True

            if router_included and public_router_included:
                logger.debug(f"Included router and public router of {module_name}.")
                routers_included += 1
            elif router_included:
                logger.debug(f"Included router of {module_name}.")
                routers_included += 1
            elif router_included:
                logger.debug(f"Included public router of {module_name}.")
                routers_included += 1

        except Exception as e:
            logger.error(f"Error including router {module_name}. ({e})")

logger.info(f"Included {routers_included} router(s).")
