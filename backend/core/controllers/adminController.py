import base64
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession
from collections import defaultdict
from typing import Any

from backend.core.access.adminVersionAccess import AdminVersionAccess
from backend.core.requests.addVersionRequest import AddVersionRequest
from backend.core.requests.uploadApkRequest import UploadApkRequest
from backend.core.requests.startChunkedUploadRequest import StartChunkedUploadRequest
from backend.core.requests.uploadChunkRequest import UploadChunkRequest
from backend.core.requests.completeChunkedUploadRequest import (
    CompleteChunkedUploadRequest,
)
from backend.core.responses.buildResponse import AllBuildsResponse, BuildResponse
from backend.core.responses.okResponse import OkResponse
from backend.core.responses.uploadApkResponse import UploadApkResponse
from backend.core.responses.startChunkedUploadResponse import StartChunkedUploadResponse
from backend.core.responses.uploadChunkResponse import UploadChunkResponse
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.constants import BUILDS_PATH, CHUNK_SIZE
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)

CHUNKED_UPLOADS: dict[str, Any] = defaultdict(
    lambda: {
        "file_path": "",
        "chunks": [],
        "total_chunks": 0,
        "version": "",
        "description": "",
    }
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(dependency=AuthMiddleware.admin_dependency)],
)


@router.get("/builds")
async def get_all_builds(request: Request) -> AllBuildsResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await AdminVersionAccess.get_all_versions_async(session=session)

    if a_result.is_not_ok():
        logger.error(f"Error fetching builds. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    builds = [
        BuildResponse(
            id=row.id,
            version=row.version,
            apkFilename=row.apk_filename,
            description=row.description,
            downloads=row.downloads,
            dateAdded=row.date_added,
        )
        for row in a_result.result()
    ]
    return AllBuildsResponse(builds=builds)


@router.post("/builds")
async def add_build(request: Request, payload: AddVersionRequest) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await AdminVersionAccess.add_version_async(
        session=session,
        version=payload.version,
        apk_filename=payload.apkFilename,
        description=payload.description,
    )

    if a_result.is_not_ok():
        logger.error(f"Error adding build. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post("/builds/upload")
async def upload_apk(request: Request, payload: UploadApkRequest) -> UploadApkResponse:
    if not payload.fileName.endswith(".apk"):
        raise HTTPException(status_code=400, detail="Only .apk files are allowed.")

    os.makedirs(BUILDS_PATH, exist_ok=True)

    file_ext = os.path.splitext(payload.fileName)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(BUILDS_PATH, unique_filename)

    try:
        file_content = base64.b64decode(payload.fileContent)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 content.")

    with open(file_path, "wb") as f:
        f.write(file_content)

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await AdminVersionAccess.add_version_async(
        session=session,
        version=payload.version,
        apk_filename=unique_filename,
        description=payload.description,
    )

    if a_result.is_not_ok():
        os.remove(file_path)
        logger.error(f"Error adding build. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return UploadApkResponse(
        message="Build uploaded successfully.", id=a_result.result().id
    )


@router.post("/builds/upload/start")
async def start_chunked_upload(
    request: Request, payload: StartChunkedUploadRequest
) -> StartChunkedUploadResponse:
    if not payload.fileName.endswith(".apk"):
        raise HTTPException(status_code=400, detail="Only .apk files are allowed.")

    upload_id = str(uuid.uuid4())
    total_chunks = (payload.totalSize + CHUNK_SIZE - 1) // CHUNK_SIZE

    os.makedirs(BUILDS_PATH, exist_ok=True)

    file_ext = os.path.splitext(payload.fileName)[1]
    unique_filename = f"{upload_id}{file_ext}"
    file_path = os.path.join(BUILDS_PATH, unique_filename)

    CHUNKED_UPLOADS[upload_id] = {
        "file_path": file_path,
        "chunks": [],
        "total_chunks": total_chunks,
        "version": payload.version,
        "description": payload.description,
    }

    with open(file_path, "wb"):
        pass

    return StartChunkedUploadResponse(
        uploadId=upload_id, chunkSize=CHUNK_SIZE, totalChunks=total_chunks
    )


@router.post("/builds/upload/chunk")
async def upload_chunk(
    request: Request, payload: UploadChunkRequest
) -> UploadChunkResponse:
    upload = CHUNKED_UPLOADS.get(payload.uploadId)
    if not upload:
        raise HTTPException(
            status_code=400, detail="Upload session not found or expired."
        )

    if payload.chunkIndex >= payload.totalChunks:
        raise HTTPException(status_code=400, detail="Invalid chunk index.")

    try:
        chunk_data = base64.b64decode(payload.chunkData)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 chunk data.")

    with open(upload["file_path"], "ab") as f:
        f.write(chunk_data)

    upload["chunks"].append(payload.chunkIndex)

    return UploadChunkResponse(
        uploadId=payload.uploadId,
        chunkIndex=payload.chunkIndex,
        chunksReceived=len(upload["chunks"]),
        totalChunks=payload.totalChunks,
    )


@router.post("/builds/upload/complete")
async def complete_chunked_upload(
    request: Request, payload: CompleteChunkedUploadRequest
) -> UploadApkResponse:
    upload = CHUNKED_UPLOADS.pop(payload.uploadId, None)
    if not upload:
        raise HTTPException(
            status_code=400, detail="Upload session not found or expired."
        )

    file_path = upload["file_path"]
    expected_chunks = upload["total_chunks"]
    received_chunks = len(upload["chunks"])

    if received_chunks != expected_chunks:
        os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"Incomplete upload. Expected {expected_chunks} chunks, got {received_chunks}.",
        )

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await AdminVersionAccess.add_version_async(
        session=session,
        version=upload["version"],
        apk_filename=os.path.basename(file_path),
        description=upload["description"],
    )

    if a_result.is_not_ok():
        os.remove(file_path)
        logger.error(f"Error adding build. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return UploadApkResponse(
        message="Build uploaded successfully.", id=a_result.result().id
    )
