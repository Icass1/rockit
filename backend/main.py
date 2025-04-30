import asyncio
from fastapi import FastAPI, BackgroundTasks, Request, background
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json
from asyncio import sleep
import threading
from dotenv import load_dotenv

from spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults
from downloader import Downloader

load_dotenv()

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
    return {"message": "Hello World"}


@app.get("/start-download")
async def start_download(user: str, url: str, background_tasks: BackgroundTasks):
    return downloader.download_url(url=url, background_tasks=background_tasks)


@app.get("/download-status")
async def download_status(request: Request, id: str):

    return downloader.download_status(request=request, download_id=id)


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


@app.on_event('startup')
async def app_startup():
    # threading.Thread(target=downloader.download_manager).start()

    asyncio.create_task(downloader.download_manager())
