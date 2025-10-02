import os
import asyncio
import threading
from importlib import import_module

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Request, Response, WebSocket

from backend.constants import SONGS_PATH

from backend.db.ormModels.song import SongRow

from backend.downloader import downloader
from backend.responses.searchResponse import SearchResponse, SpotifyResults
from backend.responses.general.albumWithSongs import RockItAlbumWithSongsResponse

from backend.telegram.telegram_monitor import telegram_bot_task
from backend.utils.logger import getLogger
from backend.utils.fastAPIRoute import fast_api_route

from backend.spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults

from backend.init import rockit_db, downloader

logger = getLogger(__file__, "main")

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


@app.get("/spotify-album/{album_public_id}")
def get_spotify_album(album_public_id: str) -> RockItAlbumWithSongsResponse:
    """TODO"""
    return RockItAlbumWithSongsResponse.from_row(album=downloader.spotify.get_album(public_id=album_public_id))


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


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print("Web socket connected")
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            print(data)
            await websocket.send_text(f"Message text was: {data}")
    except Exception as e:
        print(e)
    print("Web socket disconnected")


@app.on_event('startup')
async def app_startup():
    """TODO"""
    asyncio.create_task(downloader.download_manager(), name="Download Manager")
    asyncio.create_task(telegram_bot_task(), name="Rockit Telegram Bot")
