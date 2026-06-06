import uuid
from logging import Logger
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.middlewares.authMiddleware import AuthMiddleware

from backend.core.framework import providers
from backend.core.framework.provider.baseUploadProvider import BaseUploadProvider

from backend.core.access.db.ormModels.user import UserRow

from backend.core.requests.uploadSongRequest import UploadSongRequest
from backend.core.requests.uploadAlbumRequest import UploadAlbumRequest
from backend.core.requests.uploadVideoRequest import UploadVideoRequest

from backend.core.responses.uploadResponse import UploadResponse
from backend.core.responses.startUploadResponse import StartUploadResponse

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/upload",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "Upload"],
)

# Pending uploads storage: upload_id -> metadata dict
PENDING_UPLOADS: dict[str, dict[str, Any]] = {}


def _get_upload_provider() -> BaseUploadProvider:
    """Get the first available upload provider or raise 501."""

    upload_providers: list[BaseUploadProvider] = providers.get_upload_providers()
    if not upload_providers:
        raise HTTPException(status_code=501, detail="No upload provider available")
    return upload_providers[0]


def _get_user(request: Request) -> UserRow:
    """Get current user from request or raise 401."""

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )
    return a_result_user.result()


# ---------------------------------------------------------------------------
# Song upload
# ---------------------------------------------------------------------------


@router.post("/song/start")
async def start_song_upload(
    request: Request,
    payload: UploadSongRequest,
) -> StartUploadResponse:
    """Initialize a song upload. Returns an uploadId to send the file to."""

    _get_user(request=request)

    upload_id: str = str(uuid.uuid4())
    PENDING_UPLOADS[upload_id] = {
        "type": "song",
        "metadata": payload,
    }

    return StartUploadResponse(uploadId=upload_id)


@router.post("/album/start")
async def start_album_upload(
    request: Request,
    payload: UploadAlbumRequest,
) -> StartUploadResponse:
    """Initialize an album upload. Returns an uploadId for cover + song files."""

    _get_user(request=request)

    upload_id: str = str(uuid.uuid4())

    PENDING_UPLOADS[upload_id] = {
        "type": "album",
        "metadata": payload,
        "cover_data": None,
        "song_files": {},
        "cover_uploaded": False,
    }

    return StartUploadResponse(uploadId=upload_id)


@router.post("/video/start")
async def start_video_upload(
    request: Request,
    payload: UploadVideoRequest,
) -> StartUploadResponse:
    """Initialize a video upload. Returns an uploadId to send the file to."""

    _get_user(request=request)

    upload_id: str = str(uuid.uuid4())
    PENDING_UPLOADS[upload_id] = {
        "type": "video",
        "metadata": payload,
    }

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

    pending = PENDING_UPLOADS.get(upload_id)
    if not pending:
        raise HTTPException(
            status_code=404, detail="Upload session not found or expired."
        )

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    provider: BaseUploadProvider = _get_upload_provider()
    file_data: bytes = await file.read()

    if pending["type"] == "song":
        PENDING_UPLOADS.pop(upload_id, None)
        a_result: AResult[UploadResponse] = await provider.upload_song_async(
            session=session,
            request=pending["metadata"],
            file_data=file_data,
        )
        if a_result.is_not_ok():
            raise HTTPException(
                status_code=a_result.get_http_code(),
                detail=a_result.message(),
            )
        return a_result.result()

    elif pending["type"] == "video":
        PENDING_UPLOADS.pop(upload_id, None)
        a_result = await provider.upload_video_async(
            session=session,
            request=pending["metadata"],
            file_data=file_data,
        )
        if a_result.is_not_ok():
            raise HTTPException(
                status_code=a_result.get_http_code(),
                detail=a_result.message(),
            )
        return a_result.result()

    raise HTTPException(
        status_code=400,
        detail=f"Cannot upload file directly to upload type '{pending['type']}'. "
        f"Use /upload/album/{{upload_id}}/cover or /upload/album/{{upload_id}}/song-index/{{index}}.",
    )


@router.post("/album/{upload_id}/cover")
async def upload_album_cover(
    request: Request,
    upload_id: str,
    file: UploadFile = File(...),
) -> UploadResponse:
    """Upload the cover art for an album."""

    pending = PENDING_UPLOADS.get(upload_id)
    if not pending:
        raise HTTPException(
            status_code=404, detail="Upload session not found or expired."
        )

    if pending["type"] != "album":
        raise HTTPException(status_code=400, detail="Upload is not an album.")

    pending["cover_data"] = await file.read()
    pending["cover_uploaded"] = True

    return UploadResponse(
        publicId="",
        message="Cover art uploaded successfully.",
        filename=file.filename,
    )


@router.post("/album/{upload_id}/song-index/{index}")
async def upload_album_song_file(
    request: Request,
    upload_id: str,
    index: int,
    file: UploadFile = File(...),
) -> UploadResponse:
    """Upload a song file for an album by its index in the song list."""

    pending = PENDING_UPLOADS.get(upload_id)
    if not pending:
        raise HTTPException(
            status_code=404, detail="Upload session not found or expired."
        )

    if pending["type"] != "album":
        raise HTTPException(status_code=400, detail="Upload is not an album.")

    album_request: UploadAlbumRequest = pending["metadata"]
    if index < 0 or index >= len(album_request.songs):
        raise HTTPException(
            status_code=400,
            detail=f"Song index {index} out of range. Album has {len(album_request.songs)} songs.",
        )

    file_data: bytes = await file.read()
    song_title: str = album_request.songs[index].title
    pending["song_files"][song_title] = file_data

    # Check if all songs have been uploaded.
    if (
        len(pending["song_files"]) == len(album_request.songs)
        and pending["cover_uploaded"]
    ):
        PENDING_UPLOADS.pop(upload_id, None)
        session: AsyncSession = DBSessionMiddleware.get_session(request=request)
        provider: BaseUploadProvider = _get_upload_provider()

        a_result: AResult[UploadResponse] = await provider.upload_album_async(
            session=session,
            request=album_request,
            cover_data=pending["cover_data"],
            song_files=pending["song_files"],
        )
        if a_result.is_not_ok():
            raise HTTPException(
                status_code=a_result.get_http_code(),
                detail=a_result.message(),
            )
        return a_result.result()

    return UploadResponse(
        publicId="",
        message=f"Song '{song_title}' uploaded ({len(pending['song_files'])}/{len(album_request.songs)}).",
        filename=file.filename,
    )
