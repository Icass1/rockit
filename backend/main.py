import os
import time
import inspect
import asyncio
import threading
from functools import wraps
from importlib import import_module
from typing import Literal

from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, BackgroundTasks, HTTPException, Request, Response

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.dialects.postgresql.dml import Insert

from backend.constants import SONGS_PATH

from backend.db.associationTables.user_lists import user_lists

from backend.db.ormModels.list import ListRow
from backend.db.ormModels.song import SongRow
from backend.db.ormModels.user import UserRow

from backend.responses.meResponse import MeResponse
from backend.responses.startDownloadResponse import StartDownloadResponse
from backend.responses.searchResponse import SearchResponse, SpotifyResults
from backend.responses.general.albumWithSongs import RockItAlbumWithSongsResponse

from backend.utils.logger import getLogger
from backend.utils.auth import get_current_user

from backend.downloader.downloader import Downloader

from backend.spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults

from backend.initDb import rockit_db

logger = getLogger(__file__, "main")

downloader = Downloader(rockit_db=rockit_db)
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


def fast_api_route(path: str):
    """
    Decorator to register a GET route in FastAPI and set the asyncio task name.
    Supports both async and sync route handlers.
    """
    def decorator(func):
        is_coroutine = inspect.iscoroutinefunction(func)

        @wraps(func)
        async def wrapper(*args, **kwargs):
            task = asyncio.current_task()
            if task:
                task.set_name(f"get - {path}")

            if is_coroutine:
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)

        app.get(path)(wrapper)
        return wrapper

    return decorator


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


@fast_api_route(path="/")
def root():
    """TODO"""
    return get_status()


@fast_api_route("/start-download")
async def start_download(user: int, url: str, background_tasks: BackgroundTasks) -> StartDownloadResponse:
    """TODO"""
    download_id = downloader.download_url(
        url=url, background_tasks=background_tasks, user_id=user)
    return StartDownloadResponse(downloadId=download_id)


@fast_api_route("/download-status")
async def download_status(request: Request, id: str):
    """TODO"""
    return downloader.download_status(request=request, download_id=id)


@fast_api_route("/download-status-mockup")
async def download_status_mockup(request: Request):
    """TODO"""
    file = open("backend/downloadStatusMockup.txt")
    content = file.readlines()
    file.close()

    def get_time(time: str):
        return int(time.split(":")[0])*3600 + int(time.split(":")[1])*60 + int(time.split(":")[2])

    start_time = get_time(content[0].split(" ")[1])
    absolute_start_time = time.time()

    async def event_generator():
        current_index = 0
        while True:
            if await request.is_disconnected():
                break
            try:
                current_time = start_time + \
                    (time.time() - absolute_start_time)

                if current_index >= len(content):
                    break

                if current_time > get_time(content[current_index].split(" ")[1]):
                    message = content[current_index].split(
                        content[current_index].split(" ")[1] + " ")[1].replace("\n", "").replace("'", '"')
                    current_index += 1

                    yield f"data: {message}\n\n"

            except asyncio.TimeoutError:
                # Send keep-alive to prevent connection from closing
                yield ": keep-alive\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@fast_api_route(path='/set-max-download-threads/{max_download_threads}')
def set_max_download_threads(request: Request, max_download_threads: str):
    """TODO"""
    downloader.set_max_download_threads(int(max_download_threads))

    return Response("OK")


@fast_api_route(path='/status')
def status(request: Request):
    """TODO"""
    return get_status()


@fast_api_route(path='/get-queue')
def get_queue(request: Request):
    """TODO"""
    return [{
        "done": song._done,
        "songName": song.get_song().name,
        "songId": song.get_song().song_id,
        "songAlbumName": song.get_song().album_name,
        "songAlbumId": song.get_song().album_id,
        "songArtist": song.get_song().artist,
    } for song in downloader.queue]


@fast_api_route(path='/get-downloads')
def get_downloads(request: Request):
    """TODO"""
    return [{
        "done": thread[1]._done,
        "songName": thread[1].get_song().name,
        "songId": thread[1].get_song().song_id,
        "songAlbumName": thread[1].get_song().album_name,
        "songAlbumId": thread[1].get_song().album_id,
        "songArtist": thread[1].get_song().artist,
        "lastMessage": thread[1].get_message_handler().get_last_messge()
    } for thread in downloader.download_threads]


@fast_api_route(path='/remove-cache')
def remove_cache():
    """
    Remove the cache of the audio handler.
    This is a workaround to prevent the cache from growing indefinitely.
    """
    count = 0

    for k in downloader.spotdl_downloader.audio_providers:
        count += 1
        k.audio_handler.cache.remove()

    return f"Removed cache of {count} audio handlers"


@app.get("/me")
def read_me(current_user: UserRow = Depends(get_current_user)):
    """TODO"""
    return MeResponse(username=current_user.username, image=current_user.image, admin=current_user.admin)


@app.get("/search")
def search(query: str) -> SearchResponse:
    """TODO"""
    spotify_search: RawSpotifyApiSearchResults = downloader.spotify.search(
        q=query, limit=6)

    return SearchResponse(spotifyResults=SpotifyResults.from_spotify_search(spotify_search=spotify_search))


@app.get("/spotify-album/{album_public_id}")
def get_spotify_album(album_public_id: str) -> RockItAlbumWithSongsResponse:
    """TODO"""
    return RockItAlbumWithSongsResponse.from_row(album=downloader.spotify.get_album(public_id=album_public_id))


@app.get("/library/add-list/{type}/{publicId}")
async def add_list_to_library(type: str, publicId: str, current_user: UserRow = Depends(get_current_user)) -> Response:
    """TODO"""

    with rockit_db.session_scope() as s:

        list_row: ListRow | None = s.query(ListRow).where(
            ListRow.type == type and ListRow.public_id == publicId).first()

        if not list_row:
            raise HTTPException(status_code=404, detail="List not found")

        user_id: int = current_user.id
        list_id: int = list_row.id

        stmt: Insert = insert(user_lists).values(
            (user_id, list_id)
        )

        s.execute(stmt)

    return Response("OK")


@app.get("/library/remove-list/{type}/{publicId}")
async def remove_list_from_library(type: Literal["album", "playlist"], publicId: str, current_user: UserRow = Depends(get_current_user)) -> Response:
    """TODO"""

    with rockit_db.session_scope() as s:

        list_row = s.query(ListRow).where(
            ListRow.type == type and ListRow.public_id == publicId).first()

        if not list_row:
            raise HTTPException(status_code=404, detail="List not found")

        user_id: int = current_user.id
        list_id: int = list_row.id

        stmt = delete(user_lists).where(user_lists.c.user_id ==
                                        user_id and user_lists.c.list_id == list_id)

        s.execute(stmt)

    return Response("OK")


@app.get("/audio/{publicId}")
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


@app.on_event('startup')
async def app_startup():
    """TODO"""
    asyncio.create_task(downloader.download_manager(), name="Download Manager")
