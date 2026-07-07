from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.adminVersionAccess import AdminVersionAccess
from backend.core.framework.admin.build import AdminBuild
from backend.core.framework.admin.requestLogStats import RequestLogStats
from backend.core.framework.admin.userRequest import UserRequest as UserRequestFramework
from backend.core.requests.addVersionRequest import AddVersionRequest
from backend.core.requests.uploadApkRequest import UploadApkRequest
from backend.core.requests.startChunkedUploadRequest import StartChunkedUploadRequest
from backend.core.requests.uploadChunkRequest import UploadChunkRequest
from backend.core.requests.completeChunkedUploadRequest import (
    CompleteChunkedUploadRequest,
)
from backend.core.requests.userRequestRequest import (
    GetAllRequestsRequest,
    ReviewUserRequestRequest,
)
from backend.core.responses.buildResponse import AllBuildsResponse, BuildResponse
from backend.core.responses.okResponse import OkResponse
from backend.core.responses.requestLogStatsResponse import RequestLogStatsResponse
from backend.core.responses.uploadApkResponse import UploadApkResponse
from backend.core.responses.startChunkedUploadResponse import StartChunkedUploadResponse
from backend.core.responses.uploadChunkResponse import UploadChunkResponse
from backend.core.responses.userRequestResponse import (
    UserRequestListResponse,
    UserRequestResponse,
    AdminRequestStatsResponse,
)
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)

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
            public_id=row.public_id,
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

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail=a_result_user.message())

    a_result = await AdminBuild.upload_apk_single_async(
        session=session,
        user_id=a_result_user.result().id,
        file_name=payload.fileName,
        file_content=payload.fileContent,
        version=payload.version,
        description=payload.description,
    )

    if a_result.is_not_ok():
        logger.error(f"Error uploading build. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    result = a_result.result()
    return UploadApkResponse(
        message=result.message,
        publicId=result.publicId,
        filename=result.filename,
    )


@router.post("/builds/upload/start")
async def start_chunked_upload(
    request: Request, payload: StartChunkedUploadRequest
) -> StartChunkedUploadResponse:
    if not payload.fileName.endswith(".apk"):
        raise HTTPException(status_code=400, detail="Only .apk files are allowed.")

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(status_code=401, detail=a_result_user.message())

    a_result = await AdminBuild.start_chunked_upload_async(
        session=session,
        user_id=a_result_user.result().id,
        file_name=payload.fileName,
        total_size=payload.totalSize,
        version=payload.version,
        description=payload.description,
    )

    if a_result.is_not_ok():
        logger.error(f"Error starting chunked upload. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    result = a_result.result()
    return StartChunkedUploadResponse(
        uploadId=result.uploadId,
        chunkSize=result.chunkSize,
        totalChunks=result.totalChunks,
    )


@router.post("/builds/upload/chunk")
async def upload_chunk(
    request: Request, payload: UploadChunkRequest
) -> UploadChunkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await AdminBuild.upload_chunk_async(
        session=session,
        upload_id=payload.uploadId,
        chunk_index=payload.chunkIndex,
        chunk_data=payload.chunkData,
        total_chunks=payload.totalChunks,
    )

    if a_result.is_not_ok():
        logger.error(f"Error uploading chunk. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    result = a_result.result()
    return UploadChunkResponse(
        uploadId=result.uploadId,
        chunkIndex=result.chunkIndex,
        chunksReceived=result.chunksReceived,
        totalChunks=result.totalChunks,
    )


@router.post("/builds/upload/complete")
async def complete_chunked_upload(
    request: Request, payload: CompleteChunkedUploadRequest
) -> UploadApkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await AdminBuild.complete_chunked_upload_async(
        session=session, upload_id=payload.uploadId
    )

    if a_result.is_not_ok():
        logger.error(f"Error completing chunked upload. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    result = a_result.result()
    return UploadApkResponse(
        message=result.message,
        publicId=result.publicId,
        filename=result.filename,
    )


@router.get("/request-logs/stats")
async def get_request_log_stats(request: Request) -> RequestLogStatsResponse:
    """Get request log statistics for admin dashboard."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await RequestLogStats.get_stats_async(session=session)

    if a_result.is_not_ok():
        logger.error(f"Error getting request log stats. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.post("/requests")
async def get_all_requests(
    request: Request,
    payload: GetAllRequestsRequest,
) -> UserRequestListResponse:
    """Get all user requests (with optional status filter)."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result = await UserRequestFramework.get_all_requests_async(
        session=session,
        status=payload.status,
        limit=payload.limit,
        offset=payload.offset,
    )

    if a_result.is_not_ok():
        logger.error(f"Error fetching requests. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("/requests/stats")
async def get_request_stats(request: Request) -> AdminRequestStatsResponse:
    """Get user request statistics."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result = await UserRequestFramework.get_stats_async(session=session)

    if a_result.is_not_ok():
        logger.error(f"Error fetching request stats. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.post("/requests/{public_id}/review")
async def review_request(
    request: Request,
    public_id: str,
    payload: ReviewUserRequestRequest,
) -> UserRequestResponse:
    """Accept or reject a user request."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )

    a_result = await UserRequestFramework.review_request_async(
        session=session,
        public_id=public_id,
        reviewer_id=a_result_user.result().id,
        status=payload.status,
        review_comment=payload.reviewComment,
    )

    if a_result.is_not_ok():
        logger.error(f"Error reviewing request. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()
