import os
from importlib import import_module

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from backend.utils.logger import getLogger


os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["TERM"] = "xterm"
os.environ["COLUMNS"] = "120"


logger = getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Search and initialize all routers.
for dirpath, dirnames, filenames in os.walk("backend"):
    if not dirpath.endswith("/controllers"):
        continue

    print(dirpath, dirnames, filenames)

    for file_name in filenames:
        if not file_name.endswith(".py"):
            continue

        if file_name == "__init__.py":
            continue

        module_name = file_name.replace(".py", "")

        logger.info(f"Including router {module_name}.")

        module = import_module(f"{'.'.join(dirpath.split('/'))}.{module_name}")
        try:
            app.include_router(module.router)
        except Exception as e:
            logger.error(f"Error including router {module_name}. ({e})")


# @app.on_event('startup')
# async def app_startup():
#     """TODO"""
#     asyncio.create_task(downloader.download_manager(), name="Download Manager")
#     # asyncio.create_task(telegram_bot_task(), name="Rockit Telegram Bot")
