import os
import asyncio
import threading
from sqlalchemy import select
from typing import List, Optional
from importlib import import_module

from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, Request, Response, WebSocket

from backend.constants import SONGS_PATH
from backend.downloader import downloader
from backend.init import rockit_db, downloader
from backend.db.ormModels.main.list import ListRow
from backend.telegram.telegram_monitor import telegram_bot_task
from backend.responses.rockItSongWithAlbumResponse import RockItSongWithAlbumResponse

from backend.db.ormModels.main.user import UserRow
from backend.db.ormModels.main.song import SongRow
from backend.db.associationTables.user_queue_songs import user_queue_songs

from backend.responses.queueResponse import QueueResponse, QueueResponseItem, QueueResponseItemList
from backend.responses.searchResponse import SearchResponse, SpotifyResults

from backend.utils.logger import getLogger
from backend.utils.websocket import process_websocket
from backend.utils.fastAPIRoute import fast_api_route
from backend.utils.auth import get_current_user, get_current_user_from_token

from backend.spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults


logger = getLogger(__name__)

app = FastAPI()

# Search and initialize all routers.
for file_name in os.listdir("backend/routers"):
    if not file_name.endswith(".py"):
        continue

    if file_name == "__init__.py":
        continue

    module_name = file_name.replace(".py", "")

    logger.info(f"Including router {module_name}.")

    module = import_module(f"backend.routers.{module_name}")
    try:
        app.include_router(module.router)
    except Exception as e:
        logger.error(f"Error including router {module_name}. ({e})")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_status():
    """TODO"""
    return {
        "queueLength": len(downloader.queue),
        "maxDownloadThreads": downloader.max_download_threads,
        "currentDownloads": len(downloader.download_threads),
        "numberOfThreadsActive": threading.active_count(),
        "numberOfThreads": len(threading.enumerate()),
        "threads": [thread.name for thread in threading.enumerate()],
        "asyncioTasks": [task.get_name() for task in asyncio.all_tasks()],
        "fastapiVersion": app.version,
    }


@fast_api_route(app=app, path="/")
def root():
    """TODO"""
    return get_status()


@fast_api_route(app=app, path='/status')
def status(request: Request):
    """TODO"""
    return get_status()


@fast_api_route(app=app, path='/search')
def search(query: str) -> SearchResponse:
    """TODO"""
    spotify_search: RawSpotifyApiSearchResults = downloader.spotify.search(
        q=query, limit=6)

    return SearchResponse(spotifyResults=SpotifyResults.from_spotify_search(spotify_search=spotify_search))


@fast_api_route(app=app, path="/audio/{publicId}")
async def get_audio(request: Request, publicId: str) -> Response:
    """TODO"""
    song_row = rockit_db.execute_with_session(lambda s: s.query(
        SongRow).where(SongRow.public_id == publicId).first())

    if not song_row:
        raise HTTPException(status_code=404, detail="Song not found")

    if not song_row.path:
        raise HTTPException(status_code=404, detail="Song not downloaded")

    file_path = os.path.join(SONGS_PATH, song_row.path)
    file_size = os.path.getsize(file_path)

    range_header = request.headers.get("range")
    if range_header is None:
        with open(file_path, "rb") as f:
            data = f.read()
        return Response(
            content=data,
            media_type="audio/mpeg",
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            },
        )

    bytes_range = range_header.strip().split("=")[-1]
    start_str, end_str = bytes_range.split("-")

    try:
        start = int(start_str)
        end = int(end_str) if end_str else file_size - 1
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Range header")

    if start >= file_size or end >= file_size:
        raise HTTPException(
            status_code=416, detail="Requested Range Not Satisfiable")

    length = end - start + 1

    with open(file_path, "rb") as f:
        f.seek(start)
        data = f.read(length)

    return Response(
        content=data,
        status_code=206,
        media_type="audio/mpeg",
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
        },
    )


@fast_api_route(app=app, path="/queue")
def get_queue(current_user: UserRow = Depends(get_current_user)) -> QueueResponse:

    with rockit_db.session_scope() as s:
        user_row = s.query(UserRow).where(
            UserRow.id == current_user.id).first()

        if not user_row:
            logger.error("This should never happen. user_row is None.")
            raise HTTPException(status_code=500, detail="Song not found")

        stmt = select(user_queue_songs).where(
            user_queue_songs.c.user_id == user_row.id
        )

        result = s.execute(stmt).mappings().all()

        queue_items: List[QueueResponseItem] = []

        for row in result:
            list_row: ListRow | None = s.query(ListRow).where(
                ListRow.id == row["list_id"]).first()

            if not list_row:
                logger.error(f"list_row is None. List id: {row['list_id']}")
                continue

            queue_items.append(
                QueueResponseItem(
                    song=RockItSongWithAlbumResponse.from_row(
                        s.query(SongRow).where(SongRow.id == row["song_id"]).first()),
                    queueSongId=row["queue_song_id"],
                    list=QueueResponseItemList(
                        type=row["list_type"],
                        publicId=list_row.public_id,
                    )
                )

            )

        return QueueResponse(
            currentQueueSongId=user_row.queue_song_id,
            queue=queue_items
        )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token: Optional[str] = websocket.query_params.get(
        "token") or websocket.headers.get("Authorization")

    user_row = get_current_user_from_token(token)

    logger.debug(f"Web socket connected {user_row.id}")

    await websocket.accept()
    try:
        while True:
            data: str = await websocket.receive_text()
            process_websocket(user_row.id, data)
            # await websockept.send_text(f"Message text was: {data}")
    except Exception as e:
        print(e)

    logger.debug(f"Web socket disconnected {user_row.id}")


@app.on_event('startup')
async def app_startup():
    """TODO"""
    asyncio.create_task(downloader.download_manager(), name="Download Manager")
    asyncio.create_task(telegram_bot_task(), name="Rockit Telegram Bot")
