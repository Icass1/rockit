import time
import asyncio

from fastapi.responses import StreamingResponse
from fastapi import APIRouter,  BackgroundTasks,  Request, Response

from backend.downloader import downloader
from backend.responses.startDownloadResponse import StartDownloadResponse

from backend.utils.fastAPIRoute import fast_api_route
from backend.utils.logger import getLogger

from backend.init import downloader


logger = getLogger(__file__)
router = APIRouter(prefix="/downloader")


@fast_api_route(router, "/start-download")
async def start_download(user: int, url: str, background_tasks: BackgroundTasks) -> StartDownloadResponse:
    """TODO"""
    download_id = downloader.download_url(
        url=url, background_tasks=background_tasks, user_id=user)
    return StartDownloadResponse(downloadId=download_id)


@fast_api_route(router, "/download-status")
async def download_status(request: Request, id: str):
    """TODO"""
    return downloader.download_status(request=request, download_id=id)


@fast_api_route(router, "/download-status-mockup")
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


@fast_api_route(router, path='/set-max-threads/{max_download_threads}')
def set_max_download_threads(request: Request, max_download_threads: str):
    """TODO"""
    downloader.set_max_download_threads(int(max_download_threads))

    return Response("OK")


@fast_api_route(router, path='/get-queue')
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


@fast_api_route(router, path='/get-downloads')
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


@fast_api_route(router, path='/remove-cache')
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
