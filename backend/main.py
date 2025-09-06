import json
from re import S
import time
import inspect
import asyncio
import threading
from functools import wraps
import traceback
from typing import Optional
from jose import jwt, JWTError
from datetime import UTC, datetime, timedelta
from pydantic import BaseModel
from passlib.context import CryptContext

from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, BackgroundTasks, Request, Response, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.backendUtils import create_id
from backend.constants import JWT_SECRET
from backend.db.ormModels.user import UserRow
from backend.downloader import Downloader
from backend.logger import getLogger
from backend.responses.meResponse import MeReponse
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults

from backend.db.db import RockitDB

logger = getLogger(__file__, "main")

rockit_db = RockitDB("admin", "admin", "12.12.12.3", 5432, "development_1")
downloader = Downloader(rockit_db)
app = FastAPI()

# protected endpoints
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic schemas


class LoginIn(BaseModel):
    username: str
    password: str


class SignUp(BaseModel):
    username: str
    password: str
    repeatPassword: str


class OAuthIn(BaseModel):
    provider: str
    provider_account_id: str
    username: Optional[str] = None
    name: Optional[str] = None
    image: Optional[str] = None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=401, detail="Invalid token")
    with rockit_db.session_scope() as s:
        user = get_user(s, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user


# Token helper
def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

# small helpers


def get_user_by_username(db, username: str):
    return db.query(UserRow).filter(UserRow.username == username).first()


def get_user(db, user_id: int):
    return db.query(UserRow).filter(UserRow.id == user_id).first()


async def waypoints_generator():
    waypoints = open('waypoints.json')
    waypoints = json.load(waypoints)
    for waypoint in waypoints[0: 10]:
        data = json.dumps(waypoint)
        yield f"event: locationUpdate\ndata: {data}\n\n"
        print(f"event: locationUpdate\ndata: {data}")
        await asyncio.sleep(1)


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
async def start_download(user: int, url: str, background_tasks: BackgroundTasks):
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

    downloader.set_max_download_threads(int(max_download_threads))

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


@app.post("/auth/signup")
def signup(payload: SignUp):

    if payload.password != payload.repeatPassword:
        raise HTTPException(status_code=400, detail="Passwords not match.")

    with rockit_db.session_scope() as s:
        user_to_add = UserRow(
            public_id=create_id(),
            username=payload.username,
            password_hash=pwd_ctx.hash(payload.password)
        )
        if s.query(UserRow).where(UserRow.username == payload.username).first():
            raise HTTPException(status_code=400, detail="User already exists.")

        s.add(user_to_add)
        s.commit()

    return "OK"


@app.post("/auth/login")
def login(payload: LoginIn):
    with rockit_db.session_scope() as s:
        user: UserRow | None = get_user_by_username(s, payload.username)
        if not user or not user.password_hash or not pwd_ctx.verify(payload.password, user.password_hash):
            raise HTTPException(
                status_code=401, detail="Invalid credentials")
        token = create_access_token(
            {"user_id": str(user.id), "sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "name": user.username, "image": user.image}}

# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMSIsInN1YiI6IjEiLCJleHAiOjE3NTcxOTY0MDJ9._YpiEWLeGDHuVWRaKyLAAuj4izIi3CudoXwQCJ1dVfw


@app.post("/auth/oauth")
def oauth_upsert(payload: OAuthIn):

    with rockit_db.session_scope() as s:
        user = None
        if payload.username:
            user: UserRow | None = get_user_by_username(
                db=s, username=payload.username)
        if not user:
            user = s.query(_entity=UserRow).filter(UserRow.provider == payload.provider,
                                                   UserRow.provider_account_id == payload.provider_account_id).first()
        if not user:
            # create
            user = UserRow(
                public_id=create_id(),
                username=payload.username,
                provider=payload.provider,
                provider_account_id=payload.provider_account_id
            )
            s.add(user)
            s.commit()
            s.refresh(user)
        else:
            # update some fields if useful
            user.username = payload.name or user.username
            user.image = payload.image or user.image
            user.provider = payload.provider
            user.provider_account_id = payload.provider_account_id
        token = create_access_token(
            {"user_id": str(user.id), "sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "username": user.username, "image": user.image}}


@app.get("/me")
def read_me(current_user: UserRow = Depends(get_current_user)):
    return MeReponse(username=current_user.username, image=current_user.image, admin=current_user.admin)


@app.on_event('startup')
async def app_startup():
    asyncio.create_task(downloader.download_manager(), name="Download Manager")
