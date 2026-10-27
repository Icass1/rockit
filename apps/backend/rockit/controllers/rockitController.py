import json
import os
import shutil
from logging import Logger
from typing import Any, cast

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from constants import TEMP_PATH
from core.access.db.ormModels.user import UserRow
from core.framework import providers
from core.framework.notification import Notification
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.framework.provider.baseUploadProvider import BaseUploadProvider
from core.framework.user.user import User
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.requests.uploadAlbumRequest import UploadAlbumRequest
from core.requests.uploadSongRequest import UploadSongRequest
from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.uploadResponse import UploadResponse
from core.utils.createId import create_id
from logger import getLogger
from result import Result

logger: Logger = getLogger(__name__)

router = APIRouter(prefix="/rockit", tags=["rockit"])

_STREAM_CHUNK_SIZE = 1024 * 1024  # 1MB


async def _stream_to_file(upload_file: UploadFile, dest_path: str) -> None:
    """Stream an UploadFile to disk in chunks without loading into RAM."""

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    async with aiofiles.open(dest_path, "wb") as f:
        while True:
            chunk = await upload_file.read(_STREAM_CHUNK_SIZE)
            if not chunk:
                break
            await f.write(chunk)


async def _add_uploaded_media_to_library(
    session: AsyncSession, user_id: int, media_public_id: str
) -> None:
    """Add a successfully uploaded media item to its uploader's library."""
    a_result = await User.add_medias_to_library_async(
        session=session, user_id=user_id, public_ids=[media_public_id]
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding uploaded media to library. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())


@router.post("/upload/song", response_model=UploadResponse)
async def upload_rockit_song(
    request: Request,
    file: UploadFile = File(...),
    image: UploadFile = File(...),
    title: str = Form(...),
    artistNames: list[str] = Form(...),
    discNumber: int = Form(...),
    trackNumber: int = Form(...),
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> UploadResponse:
    """Upload a song file to the RockIt provider."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )

    provider: BaseUploadProvider | None = _get_rockit_upload_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt upload provider not found")

    upload_id: str = create_id(32)
    temp_dir: str = f"{TEMP_PATH}/rockit/uploads/{upload_id}"
    file_path: str = os.path.join(temp_dir, "file")
    image_path: str = os.path.join(temp_dir, "image")

    await _stream_to_file(upload_file=file, dest_path=file_path)
    await _stream_to_file(upload_file=image, dest_path=image_path)

    upload_request: UploadSongRequest = UploadSongRequest(
        title=title,
        artistNames=artistNames,
        fileSize=os.path.getsize(file_path),
        discNumber=discNumber,
        trackNumber=trackNumber,
    )

    a_result: Result[UploadResponse] = await provider.upload_song_async(
        session=session,
        request=upload_request,
        file_path=file_path,
        image_path=image_path,
    )

    notification = await Notification.import_async(
        session=session,
        user_id=a_result_user.result().id,
        operation_id=upload_id,
        success=a_result.is_ok(),
        title=upload_request.title,
    )
    if notification.is_not_ok():
        logger.error(f"Import notification failed: {notification.info()}")

    shutil.rmtree(temp_dir, ignore_errors=True)

    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    await _add_uploaded_media_to_library(
        session=session,
        user_id=a_result_user.result().id,
        media_public_id=a_result.result().publicId,
    )

    return a_result.result()


@router.post("/upload/album", response_model=UploadResponse)
async def upload_rockit_album(
    request: Request,
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> UploadResponse:
    """Upload an album with songs to the RockIt provider.

    Accepts multipart form data with:
    - metadata: JSON string with title, artistName, songs[{title, fileSize}]
    - cover: optional cover image file
    - {index}_song: song files named by index (0_song, 1_song, ...)
    """

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )

    provider: BaseUploadProvider | None = _get_rockit_upload_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt upload provider not found")

    form = await request.form()

    raw_metadata = form.get("metadata")
    if not isinstance(raw_metadata, str) or not raw_metadata:
        raise HTTPException(status_code=400, detail="Missing metadata field")

    try:
        metadata: dict[str, Any] = json.loads(raw_metadata)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON")

    title = str(metadata.get("title", "Unknown Album"))
    raw_artists = metadata.get("artistName", ["Unknown Artist"])
    if isinstance(raw_artists, list):
        artist_names: list[str] = [str(a) for a in cast(list[Any], raw_artists)]
    else:
        artist_names = [str(raw_artists)]
    raw_songs = metadata.get("songs", [])
    if isinstance(raw_songs, list):
        songs_meta: list[dict[str, Any]] = [
            cast(dict[str, Any], s) for s in cast(list[Any], raw_songs)
        ]
    else:
        songs_meta = []

    upload_id: str = create_id(32)
    temp_dir: str = f"{TEMP_PATH}/rockit/uploads/{upload_id}"

    raw_cover = form.get("cover")
    if not isinstance(raw_cover, UploadFile):
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Cover image file is required")
    cover_path: str = os.path.join(temp_dir, "cover")
    await _stream_to_file(upload_file=raw_cover, dest_path=cover_path)

    song_paths: dict[str, str] = {}
    for i, song_meta in enumerate(songs_meta):
        song_title: str = str(song_meta.get("title", f"Track {i + 1}"))
        field_name: str = f"{i}_song"
        raw_song_file = form.get(field_name)
        song_file: UploadFile | None = (
            raw_song_file if isinstance(raw_song_file, UploadFile) else None
        )
        if song_file is not None:
            song_path: str = os.path.join(temp_dir, f"song_{i}")
            await _stream_to_file(upload_file=song_file, dest_path=song_path)
            song_paths[song_title] = song_path

    song_requests: list[UploadSongRequest] = [
        UploadSongRequest(
            title=str(s.get("title", f"Track {idx + 1}")),
            artistNames=artist_names,
            fileSize=0,
            discNumber=int(s.get("discNumber", 1)),
            trackNumber=int(s.get("trackNumber", idx + 1)),
        )
        for idx, s in enumerate(songs_meta)
    ]

    release_date: str = str(metadata.get("releaseDate", ""))

    upload_request: UploadAlbumRequest = UploadAlbumRequest(
        title=title,
        artistNames=artist_names,
        songs=song_requests,
        releaseDate=release_date,
    )

    a_result: Result[UploadResponse] = await provider.upload_album_async(
        session=session,
        request=upload_request,
        cover_path=cover_path,
        song_paths=song_paths,
    )

    notification = await Notification.import_async(
        session=session,
        user_id=a_result_user.result().id,
        operation_id=upload_id,
        success=a_result.is_ok(),
        title=upload_request.title,
    )
    if notification.is_not_ok():
        logger.error(f"Import notification failed: {notification.info()}")

    shutil.rmtree(temp_dir, ignore_errors=True)

    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    await _add_uploaded_media_to_library(
        session=session,
        user_id=a_result_user.result().id,
        media_public_id=a_result.result().publicId,
    )

    return a_result.result()


@router.get("/song/{public_id}", response_model=BaseSongWithAlbumResponse)
async def get_rockit_song(
    request: Request,
    public_id: str,
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> BaseSongWithAlbumResponse:
    """Get a RockIt song by public ID."""

    session = DBSessionMiddleware.get_session(request=request)

    provider: BaseMediaProvider | None = _get_rockit_media_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt media provider not found")

    a_result: Result[list[BaseSongWithAlbumResponse]] = await provider.get_songs_async(
        session=session, public_ids=[public_id]
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    songs: list[BaseSongWithAlbumResponse] = a_result.result()
    if not songs:
        raise HTTPException(status_code=404, detail="Song not found")

    return songs[0]


@router.get("/album/{public_id}", response_model=BaseAlbumWithSongsResponse)
async def get_rockit_album(
    request: Request,
    public_id: str,
    _: None = Depends(AuthMiddleware.auth_dependency),
) -> BaseAlbumWithSongsResponse:
    """Get a RockIt album by public ID."""

    session = DBSessionMiddleware.get_session(request=request)

    provider: BaseMediaProvider | None = _get_rockit_media_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt media provider not found")

    a_result: Result[list[BaseAlbumWithSongsResponse]] = await provider.get_albums_async(
        session=session, public_ids=[public_id]
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    albums: list[BaseAlbumWithSongsResponse] = a_result.result()
    if not albums:
        raise HTTPException(status_code=404, detail="Album not found")

    return albums[0]


def _get_rockit_media_provider() -> BaseMediaProvider | None:
    """Find the RockIt media provider instance."""

    for p in providers.get_media_providers():
        if p.get_name() == "RockIt":
            return p
    return None


def _get_rockit_upload_provider() -> BaseUploadProvider | None:
    """Find the RockIt upload provider instance."""

    for p in providers.get_upload_providers():
        if p.get_name() == "RockIt":
            return p
    return None
