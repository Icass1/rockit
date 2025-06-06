import asyncio
import math
from typing import List, cast
from fastapi import FastAPI, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json
from asyncio import sleep
import time
import threading
from functools import wraps
import inspect

from backend.db.song import SongDBFull
from backend.downloader import Downloader
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults

downloader = Downloader()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def waypoints_generator():
    waypoints = open('waypoints.json')
    waypoints = json.load(waypoints)
    for waypoint in waypoints[0: 10]:
        data = json.dumps(waypoint)
        yield f"event: locationUpdate\ndata: {data}\n\n"
        print(f"event: locationUpdate\ndata: {data}")
        await sleep(1)


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
    return get_status()


@fast_api_route("/start-download")
async def start_download(user: str, url: str, background_tasks: BackgroundTasks):
    return downloader.download_url(url=url, background_tasks=background_tasks, user_id=user)


@fast_api_route("/download-status")
async def download_status(request: Request, id: str):
    return downloader.download_status(request=request, download_id=id)


@fast_api_route("/download-status-mockup")
async def download_status_mockup(request: Request):

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


@fast_api_route('/search')
def search(request: Request, q: str):

    search_results = RawSpotifyApiSearchResults.from_dict(downloader.spotify.api_call(path="search", params={
        "q": q, "type": "track,album,playlist,artist", "limit": "6"}))

    return {
        "songs": [a._json for a in search_results.tracks.items],
        "albums": [a._json for a in search_results.albums.items],
        "playlists": [a._json for a in search_results.playlists.items],
        "artists": [a._json for a in search_results.artists.items],
    }


@fast_api_route(path='/set-max-download-threads/{max_download_threads}')
def set_max_download_threads(request: Request, max_download_threads: str):

    downloader.max_download_threads = int(max_download_threads)
    return Response("OK")


@fast_api_route(path='/status')
def status(request: Request):

    return get_status()


@fast_api_route(path='/get-queue')
def get_queue(request: Request):

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

    return [{
        "done": thread[1]._done,
        "songName": thread[1].get_song().name,
        "songId": thread[1].get_song().song_id,
        "songAlbumName": thread[1].get_song().album_name,
        "songAlbumId": thread[1].get_song().album_id,
        "songArtist": thread[1].get_song().artist,
        "lastMessage": thread[1].get_message_handler().get_last_messge()
    } for thread in downloader.download_threads]


@fast_api_route(path='/album/{album_id}')
def get_album(request: Request, album_id):

    album = downloader.spotify.get_album(album_id)

    if not album:
        return Response("Album not found", status_code=404)

    if not album.tracks:
        return Response("Album not found", status_code=404)

    if not album.tracks.items:
        return Response("Album not found", status_code=404)

    album._json["tracks"] = downloader.spotify.get_songs(
        ids=[a.id for a in album.tracks.items if a.id])

    return album._json


@fast_api_route(path='/albums')
def get_albums(request: Request, ids: str):

    result = downloader.spotify.get_albums(ids.split(","))
    return result


@fast_api_route(path='/song/{song_id}')
def get_song(request: Request, song_id):

    song = downloader.spotify.get_song(song_id)

    if not song:
        return Response("song not found", status_code=404)

    return song[1]._json


@fast_api_route(path='/songs')
def get_songs(request: Request, ids):

    songs = downloader.spotify.get_songs(ids=ids.split(","))

    if not songs:
        return Response(content="songs not found", status_code=404)

    return [song[1]._json for song in songs]


@fast_api_route(path='/set-isrc')
def set_isrc(request: Request):

    res = downloader.spotify.db.get_all(
        "SELECT id FROM song WHERE isrc IS NULL")

    if not res:
        return Response(content="All songs seem to have the isrc set", status_code=404)

    songs = cast(List[SongDBFull], res)

    songs_id = [song.id for song in songs]

    for k in range(math.ceil(len(songs_id)/100)):

        response = downloader.spotify.api_call(
            path=f"tracks", params={"ids": ",".join(songs_id[k*100:(k + 1)*100])})

        if not response:
            continue

        tracks = response["tracks"]

        for k in tracks:
            isrc = k["external_ids"]["isrc"]
            id = k["id"]
            print(isrc, id)
            downloader.spotify.db.execute(
                "UPDATE song SET isrc = ? WHERE id = ?", (isrc, id))

    return "OK"


@fast_api_route(path='/playlist/{playlist_id}')
def get_playlist(request: Request, playlist_id):

    playlist = downloader.spotify.get_playlist(playlist_id)

    if not playlist:
        return Response("Album not found", status_code=404)

    if not playlist.tracks:
        return Response("Album not found", status_code=404)

    if not playlist.tracks.items:
        return Response("Album not found", status_code=404)

    playlist._json["tracks"] = downloader.spotify.get_songs(
        ids=[a.track.id for a in playlist.tracks.items if a.track and a.track.id])

    return playlist._json


@fast_api_route(path='/artist/{artist_id}')
def get_artist(request: Request, artist_id):

    artist = downloader.spotify.get_artist(artist_id)

    if not artist:
        return Response("Album not found", status_code=404)

    return artist._json


@fast_api_route(path='/artists')
def get_artists(request: Request, ids: str):

    return "OK"


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


@app.on_event('startup')
async def app_startup():
    asyncio.create_task(downloader.download_manager(), name="Download Manager")
