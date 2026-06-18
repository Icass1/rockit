import os
import shutil
import aiofiles
from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id
from backend.core.aResult import AResult
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.framework import providers
from backend.core.framework.provider.baseUploadProvider import BaseUploadProvider

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.pendingUpload import PendingUploadRow
from backend.core.access.pendingUploadAccess import PendingUploadAccess

from backend.core.requests.uploadSongRequest import UploadSongRequest
from backend.core.requests.uploadAlbumRequest import UploadAlbumRequest
from backend.core.requests.uploadVideoRequest import UploadVideoRequest

from backend.core.responses.uploadResponse import UploadResponse
from backend.core.responses.startUploadResponse import StartUploadResponse
from backend.core.responses.okResponse import OkResponse

from backend.constants import MEDIA_PATH

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/upload",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Upload"],
)

_STREAM_CHUNK_SIZE = 1024 * 1024  # 1MB


async def _stream_to_file(upload_file: UploadFile, dest_path: str) -> None:
    """Stream an UploadFile to disk in 1MB chunks without loading into RAM."""

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    async with aiofiles.open(dest_path, "wb") as f:
        while True:
            chunk = await upload_file.read(_STREAM_CHUNK_SIZE)
            if not chunk:
                break
            await f.write(chunk)


def _get_upload_provider() -> BaseUploadProvider:
    """Get the first available upload provider or raise 501."""

    upload_providers: list[BaseUploadProvider] = providers.get_upload_providers()
    if not upload_providers:
        logger.error("No upload provider available.")
        raise HTTPException(status_code=501, detail="No upload provider available")
    return upload_providers[0]


def _get_user(request: Request) -> UserRow:
    """Get current user from request or raise 401."""

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Failed to get current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )
    return a_result_user.result()


async def _get_pending_or_404(
    session: AsyncSession, upload_id: str
) -> PendingUploadRow:
    """Fetch a pending upload by public_id or raise 404."""

    a_result = await PendingUploadAccess.get_by_public_id_async(
        session=session, public_id=upload_id
    )
    if a_result.is_not_ok():
        logger.error(f"Pending upload not found. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail="Upload session not found or expired.",
        )
    return a_result.result()


def _upload_temp_dir(upload_id: str) -> str:
    """Get the temporary directory path for an upload."""

    return f"{MEDIA_PATH}/rockit/uploads/{upload_id}"


def _upload_temp_cover_path(upload_id: str) -> str:
    """Get the temporary cover file path for an album upload."""

    return f"{_upload_temp_dir(upload_id=upload_id)}/cover"


def _upload_temp_song_dir(upload_id: str) -> str:
    """Get the temporary song files directory for an album upload."""

    return f"{_upload_temp_dir(upload_id=upload_id)}/songs"


def _upload_temp_song_path(upload_id: str, index: int) -> str:
    """Get the temporary file path for a song at a given index."""

    return f"{_upload_temp_song_dir(upload_id=upload_id)}/{index}"


async def _cleanup_upload_temp_dir(upload_id: str) -> None:
    """Remove the temporary upload directory and all its contents."""

    temp_dir: str = _upload_temp_dir(upload_id=upload_id)
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)


@router.post("/song/start")
async def start_song_upload(
    request: Request,
    payload: UploadSongRequest,
) -> StartUploadResponse:
    """Initialize a song upload. Returns an uploadId to send the file to."""

    user: UserRow = _get_user(request=request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    upload_id: str = create_id(32)
    a_result = await PendingUploadAccess.create_async(
        session=session,
        public_id=upload_id,
        user_id=user.id,
        media_type=MediaTypeEnum.SONG.name,
        metadata_json=payload.model_dump_json(),
    )
    if a_result.is_not_ok():
        logger.error(f"Failed to create song upload session. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    return StartUploadResponse(uploadId=upload_id)


@router.post("/album/start")
async def start_album_upload(
    request: Request,
    payload: UploadAlbumRequest,
) -> StartUploadResponse:
    """Initialize an album upload. Returns an uploadId for cover + song files."""

    user: UserRow = _get_user(request=request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    upload_id: str = create_id(32)
    a_result = await PendingUploadAccess.create_async(
        session=session,
        public_id=upload_id,
        user_id=user.id,
        media_type=MediaTypeEnum.ALBUM.name,
        metadata_json=payload.model_dump_json(),
    )
    if a_result.is_not_ok():
        logger.error(f"Failed to create album upload session. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    return StartUploadResponse(uploadId=upload_id)


@router.post("/video/start")
async def start_video_upload(
    request: Request,
    payload: UploadVideoRequest,
) -> StartUploadResponse:
    """Initialize a video upload. Returns an uploadId to send the file to."""

    user: UserRow = _get_user(request=request)
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    upload_id: str = create_id(32)
    a_result = await PendingUploadAccess.create_async(
        session=session,
        public_id=upload_id,
        user_id=user.id,
        media_type=MediaTypeEnum.VIDEO.name,
        metadata_json=payload.model_dump_json(),
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    return StartUploadResponse(uploadId=upload_id)


@router.post("/{upload_id}/file")
async def upload_file(
    request: Request,
    upload_id: str,
    file: UploadFile = File(...),
    image: UploadFile | None = File(default=None),
) -> UploadResponse:
    """Upload a file for a previously initialized upload.

    Optionally include an `image` file field for song/video uploads to set cover art.
    For album uploads, include query parameter ?index=N (0-based) to
    associate the file with the Nth song in the album's song list.
    """

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    pending: PendingUploadRow = await _get_pending_or_404(
        session=session, upload_id=upload_id
    )
    provider: BaseUploadProvider = _get_upload_provider()

    temp_dir: str = _upload_temp_dir(upload_id=upload_id)
    file_path: str = os.path.join(temp_dir, "file")
    await _stream_to_file(upload_file=file, dest_path=file_path)

    image_path: str | None = None
    if image is not None:
        image_path = os.path.join(temp_dir, "image")
        await _stream_to_file(upload_file=image, dest_path=image_path)

    if pending.media_type_key == MediaTypeEnum.SONG.value:
        request_model: UploadSongRequest = UploadSongRequest.model_validate_json(
            pending.metadata_json
        )
        await PendingUploadAccess.delete_by_public_id_async(
            session=session, public_id=upload_id
        )
        a_result = await provider.upload_song_async(
            session=session,
            request=request_model,
            file_path=file_path,
            image_path=image_path,
        )
        await _cleanup_upload_temp_dir(upload_id=upload_id)
        if a_result.is_not_ok():
            logger.error(f"Failed to upload song. {a_result.info()}")
            raise HTTPException(
                status_code=a_result.get_http_code(),
                detail=a_result.message(),
            )
        return a_result.result()

    elif pending.media_type_key == MediaTypeEnum.VIDEO.value:
        video_request: UploadVideoRequest = UploadVideoRequest.model_validate_json(
            pending.metadata_json
        )
        await PendingUploadAccess.delete_by_public_id_async(
            session=session, public_id=upload_id
        )
        a_result = await provider.upload_video_async(
            session=session,
            request=video_request,
            file_path=file_path,
            image_path=image_path,
        )
        await _cleanup_upload_temp_dir(upload_id=upload_id)
        if a_result.is_not_ok():
            logger.error(f"Failed to upload video. {a_result.info()}")
            raise HTTPException(
                status_code=a_result.get_http_code(),
                detail=a_result.message(),
            )
        return a_result.result()

    await _cleanup_upload_temp_dir(upload_id=upload_id)
    logger.error(
        f"Unsupported media type for direct upload: '{pending.media_type_key}'."
    )
    raise HTTPException(
        status_code=400,
        detail=f"Cannot upload file directly to upload type '{pending.media_type_key}'. "
        f"Use /upload/album/{{upload_id}}/cover or /upload/album/{{upload_id}}/song-index/{{index}}.",
    )


@router.post("/album/{upload_id}/cover")
async def upload_album_cover(
    request: Request,
    upload_id: str,
    file: UploadFile = File(...),
) -> OkResponse:
    """Upload the cover art for an album."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    pending: PendingUploadRow = await _get_pending_or_404(
        session=session, upload_id=upload_id
    )

    if pending.media_type_key != MediaTypeEnum.ALBUM.value:
        logger.error(f"Attempted to upload cover for non-album upload '{upload_id}'.")
        raise HTTPException(status_code=400, detail="Upload is not an album.")

    cover_path: str = _upload_temp_cover_path(upload_id=upload_id)
    await _stream_to_file(upload_file=file, dest_path=cover_path)

    a_result = await PendingUploadAccess.set_cover_uploaded_async(
        session=session, public_id=upload_id
    )
    if a_result.is_not_ok():
        logger.error(f"Failed to mark cover as uploaded. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    return OkResponse()


@router.post("/album/{upload_id}/song-index/{index}")
async def upload_album_song_file(
    request: Request,
    upload_id: str,
    index: int,
    file: UploadFile = File(...),
) -> UploadResponse:
    """Upload a song file for an album by its index in the song list."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    pending: PendingUploadRow = await _get_pending_or_404(
        session=session, upload_id=upload_id
    )

    if pending.media_type_key != MediaTypeEnum.ALBUM.value:
        logger.error(
            f"Attempted to upload song file for non-album upload '{upload_id}'."
        )
        raise HTTPException(status_code=400, detail="Upload is not an album.")

    album_request: UploadAlbumRequest = UploadAlbumRequest.model_validate_json(
        pending.metadata_json
    )
    if index < 0 or index >= len(album_request.songs):
        logger.error(
            f"Song index {index} out of range for album upload '{upload_id}' (max {len(album_request.songs) - 1})."
        )
        raise HTTPException(
            status_code=400,
            detail=f"Song index {index} out of range. Album has {len(album_request.songs)} songs.",
        )

    song_path: str = _upload_temp_song_path(upload_id=upload_id, index=index)
    await _stream_to_file(upload_file=file, dest_path=song_path)

    a_result = await PendingUploadAccess.increment_uploaded_song_count_async(
        session=session, public_id=upload_id
    )
    if a_result.is_not_ok():
        logger.error(f"Failed to increment uploaded song count. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )

    pending = await _get_pending_or_404(session=session, upload_id=upload_id)

    if (
        pending.uploaded_song_count >= len(album_request.songs)
        and pending.cover_uploaded
    ):
        cover_path: str = _upload_temp_cover_path(upload_id=upload_id)
        cover_path_to_pass: str | None = (
            cover_path if os.path.exists(cover_path) else None
        )

        song_paths: dict[str, str] = {}
        for i, song_meta in enumerate(album_request.songs):
            sp: str = _upload_temp_song_path(upload_id=upload_id, index=i)
            if os.path.exists(sp):
                song_paths[song_meta.title] = sp

        await PendingUploadAccess.delete_by_public_id_async(
            session=session, public_id=upload_id
        )

        provider: BaseUploadProvider = _get_upload_provider()
        a_result = await provider.upload_album_async(
            session=session,
            request=album_request,
            cover_path=cover_path_to_pass,
            song_paths=song_paths,
        )

        await _cleanup_upload_temp_dir(upload_id=upload_id)

        if a_result.is_not_ok():
            logger.error(f"Failed to upload album. {a_result.info()}")
            raise HTTPException(
                status_code=a_result.get_http_code(),
                detail=a_result.message(),
            )
        return a_result.result()

    return UploadResponse(
        publicId="",
        message=f"Song '{album_request.songs[index].title}' uploaded ({pending.uploaded_song_count}/{len(album_request.songs)}).",
        filename=file.filename,
    )


@router.post("/{upload_id}/chunk")
async def upload_media_chunk(
    request: Request,
    upload_id: str,
    index: int,
    total: int,
    chunk: UploadFile = File(...),
) -> OkResponse:
    """Upload one binary chunk for a pending media upload.

    Send chunks sequentially with index 0 … total-1, then call
    POST /{upload_id}/assemble to concatenate and process.
    """

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    await _get_pending_or_404(session=session, upload_id=upload_id)

    chunk_path: str = os.path.join(
        _upload_temp_dir(upload_id=upload_id), "chunks", str(index)
    )
    await _stream_to_file(upload_file=chunk, dest_path=chunk_path)
    return OkResponse()


@router.post("/{upload_id}/assemble")
async def assemble_media_upload(
    request: Request,
    upload_id: str,
    total: int,
    image: UploadFile | None = File(default=None),
) -> UploadResponse:
    """Concatenate all uploaded chunks and process the media.

    Validates that all chunk files 0…total-1 are present, assembles them
    in order into a single file, then runs the same provider logic as the
    single-request upload endpoint. Optionally include an `image` field
    for song/video cover art.
    """

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    pending: PendingUploadRow = await _get_pending_or_404(
        session=session, upload_id=upload_id
    )
    provider: BaseUploadProvider = _get_upload_provider()

    temp_dir: str = _upload_temp_dir(upload_id=upload_id)
    chunks_dir: str = os.path.join(temp_dir, "chunks")

    for i in range(total):
        if not os.path.exists(os.path.join(chunks_dir, str(i))):
            logger.error(f"Missing chunk {i} for upload {upload_id}.")
            raise HTTPException(
                status_code=400, detail=f"Missing chunk {i} of {total}."
            )

    file_path: str = os.path.join(temp_dir, "file")
    os.makedirs(temp_dir, exist_ok=True)

    async with aiofiles.open(file_path, "wb") as out_f:
        for i in range(total):
            async with aiofiles.open(os.path.join(chunks_dir, str(i)), "rb") as chunk_f:
                while True:
                    data = await chunk_f.read(_STREAM_CHUNK_SIZE)
                    if not data:
                        break
                    await out_f.write(data)

    image_path: str | None = None
    if image is not None:
        image_path = os.path.join(temp_dir, "image")
        await _stream_to_file(upload_file=image, dest_path=image_path)

    if pending.media_type_key == MediaTypeEnum.SONG.value:
        request_model: UploadSongRequest = UploadSongRequest.model_validate_json(
            pending.metadata_json
        )
        await PendingUploadAccess.delete_by_public_id_async(
            session=session, public_id=upload_id
        )
        a_result = await provider.upload_song_async(
            session=session,
            request=request_model,
            file_path=file_path,
            image_path=image_path,
        )
        await _cleanup_upload_temp_dir(upload_id=upload_id)
        if a_result.is_not_ok():
            logger.error(f"Error assembling song upload. {a_result.info()}")
            raise HTTPException(
                status_code=a_result.get_http_code(),
                detail=a_result.message(),
            )
        return a_result.result()

    elif pending.media_type_key == MediaTypeEnum.VIDEO.value:
        video_request: UploadVideoRequest = UploadVideoRequest.model_validate_json(
            pending.metadata_json
        )
        await PendingUploadAccess.delete_by_public_id_async(
            session=session, public_id=upload_id
        )
        a_result = await provider.upload_video_async(
            session=session,
            request=video_request,
            file_path=file_path,
            image_path=image_path,
        )
        await _cleanup_upload_temp_dir(upload_id=upload_id)
        if a_result.is_not_ok():
            logger.error(f"Error assembling video upload. {a_result.info()}")
            raise HTTPException(
                status_code=a_result.get_http_code(),
                detail=a_result.message(),
            )
        return a_result.result()

    await _cleanup_upload_temp_dir(upload_id=upload_id)
    logger.error(
        f"Unsupported media type for chunked assembly: {pending.media_type_key}"
    )
    raise HTTPException(
        status_code=400,
        detail=f"Unsupported media type for chunked assembly: '{pending.media_type_key}'.",
    )
