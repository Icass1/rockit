from fastapi import APIRouter, Depends, HTTPException, Request
from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.adminVersionAccess import AdminVersionAccess
from backend.core.requests.addVersionRequest import AddVersionRequest
from backend.core.responses.buildResponse import AllBuildsResponse, BuildResponse
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.responses.okResponse import OkResponse
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
