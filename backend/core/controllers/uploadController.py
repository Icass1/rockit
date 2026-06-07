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


def _get_upload_provider() -> BaseUploadProvider:
    """Get the first available upload provider or raise 501."""

    upload_providers: list[BaseUploadProvider] = providers.get_upload_providers()
    if not upload_providers:
        logger.error("TODO")
        raise HTTPException(status_code=501, detail="No upload provider available")
    return upload_providers[0]


def _get_user(request: Request) -> UserRow:
    """Get current user from request or raise 401."""

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error("TODO")
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
        logger.error("TODO")
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
        logger.error("TODO")
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
        logger.error("TODO")
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
) -> UploadResponse:
    """Upload a file for a previously initialized upload.

    For album uploads, include query parameter ?index=N (0-based) to
    associate the file with the Nth song in the album's song list.
    """

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    pending: PendingUploadRow = await _get_pending_or_404(
        session=session, upload_id=upload_id
    )
    provider: BaseUploadProvider = _get_upload_provider()
    file_data: bytes = await file.read()

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
            file_data=file_data,
        )
        if a_result.is_not_ok():
            logger.error("TODO")
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
            file_data=file_data,
        )
        if a_result.is_not_ok():
            logger.error("TODO")
            raise HTTPException(
                status_code=a_result.get_http_code(),
                detail=a_result.message(),
            )
        return a_result.result()

    logger.error("TODO")
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
        logger.error("TODO")
        raise HTTPException(status_code=400, detail="Upload is not an album.")

    cover_data: bytes = await file.read()

    cover_path: str = _upload_temp_cover_path(upload_id=upload_id)
    os.makedirs(os.path.dirname(cover_path), exist_ok=True)

    async with aiofiles.open(cover_path, "wb") as f:
        await f.write(cover_data)

    a_result = await PendingUploadAccess.set_cover_uploaded_async(
        session=session, public_id=upload_id
    )
    if a_result.is_not_ok():
        logger.error("TODO")
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
        logger.error("TODO")
        raise HTTPException(status_code=400, detail="Upload is not an album.")

    album_request: UploadAlbumRequest = UploadAlbumRequest.model_validate_json(
        pending.metadata_json
    )
    if index < 0 or index >= len(album_request.songs):
        logger.error("TODO")
        raise HTTPException(
            status_code=400,
            detail=f"Song index {index} out of range. Album has {len(album_request.songs)} songs.",
        )

    file_data: bytes = await file.read()

    song_path: str = _upload_temp_song_path(upload_id=upload_id, index=index)
    os.makedirs(os.path.dirname(song_path), exist_ok=True)

    async with aiofiles.open(song_path, "wb") as f:
        await f.write(file_data)

    a_result = await PendingUploadAccess.increment_uploaded_song_count_async(
        session=session, public_id=upload_id
    )
    if a_result.is_not_ok():
        logger.error("TODO")
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
        cover_data: bytes | None = None
        if os.path.exists(cover_path):
            async with aiofiles.open(cover_path, "rb") as f:
                cover_data = await f.read()

        song_files: dict[str, bytes] = {}
        for i, song_meta in enumerate(album_request.songs):
            sp: str = _upload_temp_song_path(upload_id=upload_id, index=i)
            if os.path.exists(sp):
                async with aiofiles.open(sp, "rb") as f:
                    song_files[song_meta.title] = await f.read()

        await PendingUploadAccess.delete_by_public_id_async(
            session=session, public_id=upload_id
        )

        provider: BaseUploadProvider = _get_upload_provider()
        a_result = await provider.upload_album_async(
            session=session,
            request=album_request,
            cover_data=cover_data,
            song_files=song_files,
        )

        await _cleanup_upload_temp_dir(upload_id=upload_id)

        if a_result.is_not_ok():
            logger.error("TODO")
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
