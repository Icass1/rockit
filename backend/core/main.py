import os
import sys
import asyncio
from typing import List
from importlib import import_module

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from backend.utils.logger import getLogger

from backend.constants import CORS_URLS

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.requestLogMiddleware import RequestLogMiddleware

from backend.core.access.db import rockit_db

from backend.core.framework.downloader import downloads_manager

os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["TERM"] = "xterm"
os.environ["COLUMNS"] = "120"


logger = getLogger(__name__)

app = FastAPI(
    title="RockIt!",
    summary="The best music player in the world.",
    version="0.0.1",
    docs_url="/docs",
)

cors_origins: List[str] = []
if CORS_URLS and CORS_URLS != "NONE":
    cors_origins.extend([url.strip() for url in CORS_URLS.split(",") if url.strip()])

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
for dirpath, dirnames, filenames in os.walk("backend"):
    if not dirpath.endswith("/controllers"):
        continue

    for file_name in filenames:
        if not file_name.endswith(".py"):
            continue

        if file_name == "__init__.py":
            continue

        module_name = file_name.replace(".py", "")

        module = import_module(f"{'.'.join(dirpath.split('/'))}.{module_name}")
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


@app.on_event("startup")
async def app_startup():
    """Initialize core enums and start background tasks."""

    from backend.core import add_initial_content_async

    try:
        await rockit_db.async_init()
    except Exception as e:
        logger.critical(f"Error initializing database: {e}")
        sys.exit()

    await add_initial_content_async()

    await rockit_db.wait_for_session_local_async()

    asyncio.create_task(downloads_manager.download_manager(), name="Download Manager")
    # asyncio.create_task(telegram_bot_task(), name="Rockit Telegram Bot")


@app.on_event("shutdown")
async def app_shutdown():
    """Close all active WebSocket connections before shutdown."""

    from backend.core.framework.websocket.webSocketManager import ws_manager

    all_sockets = [
        ws
        for connections in ws_manager.active_connections.values()
        for ws in connections
    ]
    for ws in all_sockets:
        try:
            await ws.close(code=1001)
        except Exception:
            pass
    logger.info(f"Closed {len(all_sockets)} WebSocket connection(s) on shutdown.")
