import os
import json
import shutil
from typing import Any, List, cast
from logging import Logger
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import aiofiles

from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id

from backend.core.aResult import AResult

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.core.requests.uploadSongRequest import UploadSongRequest
from backend.core.requests.uploadAlbumRequest import UploadAlbumRequest

from backend.core.responses.uploadResponse import UploadResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse

from backend.core.framework import providers
from backend.core.framework.media.stream import MediaStream
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.framework.provider.baseUploadProvider import BaseUploadProvider

from backend.core.access.mediaAccess import MediaAccess

from backend.rockit.access.rockitAccess import RockitAccess
from backend.rockit.access.db.ormModels.song import RockitSongRow
from backend.rockit.access.db.ormModels.video import RockitVideoRow

from backend.constants import MEDIA_PATH

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


@router.post("/upload/song", response_model=UploadResponse)
async def upload_rockit_song(
    request: Request,
    file: UploadFile = File(...),
    image: UploadFile = File(...),
    title: str = Form(...),
    artistNames: List[str] = Form(...),
    discNumber: int = Form(...),
    trackNumber: int = Form(...),
    _=Depends(AuthMiddleware.auth_dependency),
) -> UploadResponse:
    """Upload a song file to the RockIt provider."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )

    provider: BaseUploadProvider | None = _get_rockit_upload_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt upload provider not found")

    upload_id: str = create_id(32)
    temp_dir: str = f"{MEDIA_PATH}/rockit/uploads/{upload_id}"
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

    a_result: AResult[UploadResponse] = await provider.upload_song_async(
        session=session,
        request=upload_request,
        file_path=file_path,
        image_path=image_path,
    )

    shutil.rmtree(temp_dir, ignore_errors=True)

    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    return a_result.result()


@router.post("/upload/album", response_model=UploadResponse)
async def upload_rockit_album(
    request: Request,
    _=Depends(AuthMiddleware.auth_dependency),
) -> UploadResponse:
    """Upload an album with songs to the RockIt provider.

    Accepts multipart form data with:
    - metadata: JSON string with title, artistName, songs[{title, fileSize}]
    - cover: optional cover image file
    - {index}_song: song files named by index (0_song, 1_song, ...)
    """

    session = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
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
    temp_dir: str = f"{MEDIA_PATH}/rockit/uploads/{upload_id}"

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

    a_result: AResult[UploadResponse] = await provider.upload_album_async(
        session=session,
        request=upload_request,
        cover_path=cover_path,
        song_paths=song_paths,
    )

    shutil.rmtree(temp_dir, ignore_errors=True)

    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    return a_result.result()


@router.get("/song/{public_id}", response_model=BaseSongWithAlbumResponse)
async def get_rockit_song(
    request: Request,
    public_id: str,
    _=Depends(AuthMiddleware.auth_dependency),
) -> BaseSongWithAlbumResponse:
    """Get a RockIt song by public ID."""

    session = DBSessionMiddleware.get_session(request=request)

    provider: BaseMediaProvider | None = _get_rockit_media_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt media provider not found")

    a_result: AResult[List[BaseSongWithAlbumResponse]] = await provider.get_songs_async(
        session=session, public_ids=[public_id]
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    songs: List[BaseSongWithAlbumResponse] = a_result.result()
    if not songs:
        raise HTTPException(status_code=404, detail="Song not found")

    return songs[0]


@router.get("/album/{public_id}", response_model=BaseAlbumWithSongsResponse)
async def get_rockit_album(
    request: Request,
    public_id: str,
    _=Depends(AuthMiddleware.auth_dependency),
) -> BaseAlbumWithSongsResponse:
    """Get a RockIt album by public ID."""

    session = DBSessionMiddleware.get_session(request=request)

    provider: BaseMediaProvider | None = _get_rockit_media_provider()
    if provider is None:
        raise HTTPException(status_code=500, detail="RockIt media provider not found")

    a_result: AResult[List[BaseAlbumWithSongsResponse]] = (
        await provider.get_albums_async(session=session, public_ids=[public_id])
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    albums: List[BaseAlbumWithSongsResponse] = a_result.result()
    if not albums:
        raise HTTPException(status_code=404, detail="Album not found")

    return albums[0]


@router.get("/audio/{public_id}")
async def serve_rockit_audio(
    request: Request,
    public_id: str,
):
    """Stream an uploaded audio file with Range support."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_media: AResult[CoreMediaRow] = (
        await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=None
        )
    )
    if a_result_media.is_not_ok():
        logger.error("TODO")
        raise HTTPException(status_code=404, detail="Media not found")

    media: CoreMediaRow = a_result_media.result()

    a_result_songs: AResult[List[RockitSongRow]] = await RockitAccess.get_songs_async(
        session=session, song_ids=[media.id]
    )
    if a_result_songs.is_not_ok() or not a_result_songs.result():
        raise HTTPException(status_code=404, detail="Song not found")

    song: RockitSongRow = a_result_songs.result()[0]
    if not song.file_path or not os.path.exists(song.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    file_path: str = song.file_path
    file_size: int = os.path.getsize(file_path)
    _, file_ext = os.path.splitext(file_path)
    media_type: str = "audio/mpeg"
    if file_ext == ".ogg":
        media_type = "audio/ogg"
    elif file_ext == ".wav":
        media_type = "audio/wav"
    elif file_ext == ".flac":
        media_type = "audio/flac"

    range_header: str | None = request.headers.get("range")

    if range_header:
        range_start: int = 0
        range_end: int = file_size - 1
        if "bytes=" in range_header:
            parts: list[str] = range_header.split("bytes=")[1].split("-")
            if parts[0]:
                range_start = int(parts[0])
            if parts[1]:
                range_end = int(parts[1])

        content_length: int = range_end - range_start + 1

        async def iter_audio_range(start: int, end: int):
            async with aiofiles.open(file_path, "rb") as f:
                await f.seek(start)
                remaining: int = end - start + 1
                while remaining > 0:
                    chunk_size: int = min(1024 * 1024, remaining)
                    chunk: bytes = await f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iter_audio_range(range_start, range_end),
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {range_start}-{range_end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            },
        )

    async def iter_audio_file():
        async with aiofiles.open(file_path, "rb") as f:
            while True:
                chunk: bytes = await f.read(1024 * 1024)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(
        iter_audio_file(),
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
    )


@router.get("/video/{public_id}/stream")
async def serve_rockit_video(
    request: Request,
    public_id: str,
):
    """Stream an uploaded video file with Range support."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_media: AResult[CoreMediaRow] = (
        await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=None
        )
    )
    if a_result_media.is_not_ok():
        raise HTTPException(status_code=404, detail="Media not found")

    media: CoreMediaRow = a_result_media.result()

    a_result_videos: AResult[List[RockitVideoRow]] = (
        await RockitAccess.get_videos_async(session=session, video_ids=[media.id])
    )
    if a_result_videos.is_not_ok() or not a_result_videos.result():
        raise HTTPException(status_code=404, detail="Video not found")

    video: RockitVideoRow = a_result_videos.result()[0]
    if not video.file_path or not os.path.exists(video.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    file_path: str = video.file_path
    file_size: int = os.path.getsize(file_path)
    _, file_ext = os.path.splitext(file_path)
    media_type: str = "video/mp4"
    if file_ext == ".webm":
        media_type = "video/webm"
    elif file_ext == ".mkv":
        media_type = "video/x-matroska"

    range_header: str | None = request.headers.get("range")

    if range_header:
        range_start: int = 0
        range_end: int = file_size - 1
        if "bytes=" in range_header:
            parts: list[str] = range_header.split("bytes=")[1].split("-")
            if parts[0]:
                range_start = int(parts[0])
            if parts[1]:
                range_end = int(parts[1])

        content_length: int = range_end - range_start + 1

        async def iter_video_range(start: int, end: int):
            async with aiofiles.open(file_path, "rb") as f:
                await f.seek(start)
                remaining: int = end - start + 1
                while remaining > 0:
                    chunk_size: int = min(1024 * 1024, remaining)
                    chunk: bytes = await f.read(chunk_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iter_video_range(range_start, range_end),
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {range_start}-{range_end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            },
        )

    async def iter_video_file():
        async with aiofiles.open(file_path, "rb") as f:
            while True:
                chunk: bytes = await f.read(1024 * 1024)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(
        iter_video_file(),
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
    )


@router.get("/video/{public_id}/stream/audio")
async def serve_rockit_video_audio(
    request: Request,
    public_id: str,
):
    """Stream audio extracted from a RockIt video using ffmpeg."""

    session = DBSessionMiddleware.get_session(request=request)

    a_result_media: AResult[CoreMediaRow] = (
        await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=None
        )
    )
    if a_result_media.is_not_ok():
        raise HTTPException(status_code=404, detail="Media not found")

    media: CoreMediaRow = a_result_media.result()

    a_result_videos: AResult[List[RockitVideoRow]] = (
        await RockitAccess.get_videos_async(session=session, video_ids=[media.id])
    )
    if a_result_videos.is_not_ok() or not a_result_videos.result():
        raise HTTPException(status_code=404, detail="Video not found")

    video: RockitVideoRow = a_result_videos.result()[0]
    if not video.file_path or not os.path.exists(video.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    a_result_stream: AResult[StreamingResponse] = (
        await MediaStream.stream_audio_from_video_async(
            video_path=video.file_path, range_header=request.headers.get("range")
        )
    )
    if a_result_stream.is_not_ok():
        logger.error(f"Error streaming audio. {a_result_stream.info()}")
        raise HTTPException(
            status_code=a_result_stream.get_http_code(),
            detail=a_result_stream.message(),
        )

    return a_result_stream.result()


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
