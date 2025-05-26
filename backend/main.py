import asyncio
from fastapi import FastAPI, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json
from asyncio import sleep
import time

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


@app.get("/")
async def root():

    return {
        "queueLength": len(downloader.queue),
        "maxDownloadThreads": downloader.max_download_threads,
        "currentDownloads": len(downloader.download_threads),
        "numberOfThreadsActive": threading.active_count(),
        "numberOfThreads": len(threading.enumerate()),
        "fastapiVersion": app.version,
    }


@app.get("/start-download")
async def start_download(user: str, url: str, background_tasks: BackgroundTasks):
    return downloader.download_url(url=url, background_tasks=background_tasks, user_id=user)


@app.get("/download-status")
async def download_status(request: Request, id: str):
    return downloader.download_status(request=request, download_id=id)


@app.get("/download-status-mockup")
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


@app.get('/search')
def search(request: Request, q: str):
    search_results = RawSpotifyApiSearchResults.from_dict(downloader.spotify.api_call(path="search", params={
        "q": q, "type": "track,album,playlist,artist", "limit": "6"}))

    return {
        "songs": [a._json for a in search_results.tracks.items],
        "albums": [a._json for a in search_results.albums.items],
        "playlists": [a._json for a in search_results.playlists.items],
        "artists": [a._json for a in search_results.artists.items],
    }


@app.get(path='/set-max-download-threads/{max_download_threads}')
def set_max_download_threads(request: Request, max_download_threads: str):

    downloader.max_download_threads = int(max_download_threads)
    return Response("OK")


@app.get(path='/status')
def status(request: Request):

    return {
        "queueLength": len(downloader.queue),
        "maxDownloadThreads": downloader.max_download_threads,
        "currentDownloads": len(downloader.download_threads)
    }


@app.get(path='/get-queue')
def get_queue(request: Request):

    return [{
        "done": song._done,
        "songName": song.get_song().name,
        "songId": song.get_song().song_id,
        "songAlbumName": song.get_song().album_name,
        "songAlbumId": song.get_song().album_id,
        "songArtist": song.get_song().artist,
    } for song in downloader.queue]


@app.get(path='/get-downloads')
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


@app.get(path='/album/{album_id}')
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


@app.get(path='/playlist/{playlist_id}')
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

@app.get(path='/artist/{artist_id}')
def get_artist(request: Request, artist_id):

    artist = downloader.spotify.get_artist(artist_id)

    if not artist:
        return Response("Album not found", status_code=404)

    return artist._json


@app.on_event('startup')
async def app_startup():
    asyncio.create_task(downloader.download_manager())
