from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.storageObject import StorageObjectRow
from core.framework.storage import Storage
from core.middlewares.authMiddleware import AuthMiddleware as AuthDependency
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.responses.okResponse import OkResponse
from core.responses.storageResponses import StorageObjectResponse
from logger import logger
from result import Result as Result

storage_object_router = APIRouter(prefix="/storage-object", tags=["StorageController"])

router = storage_object_router


@storage_object_router.get("", response_model=list[StorageObjectResponse])
async def get_all_storage_objects(
    request: Request,
    _: None = Depends(AuthDependency.auth_dependency),
) -> list[StorageObjectResponse]:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[list[StorageObjectRow]] = await Storage.get_all_objects_async(session=session)
    if a_result.is_not_ok():
        logger.error(f"Error getting storage objects. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )
    return [StorageObjectResponse.from_row(found) for found in a_result.result()]


@storage_object_router.get("/{public_id}", response_model=StorageObjectResponse)
async def get_storage_object(
    request: Request,
    public_id: str,
    _: None = Depends(AuthDependency.auth_dependency),
) -> StorageObjectResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[StorageObjectRow] = await Storage.get_object_from_public_id_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting storage object. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )
    return StorageObjectResponse.from_row(a_result.result())


@storage_object_router.get("/by-public-id/{public_id}", response_model=StorageObjectResponse)
async def get_storage_object_by_public_id(
    request: Request,
    public_id: str,
    _: None = Depends(AuthDependency.auth_dependency),
) -> StorageObjectResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[StorageObjectRow] = await Storage.get_object_from_public_id_async(
        session=session, public_id=public_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting storage object by public id. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )
    return StorageObjectResponse.from_row(a_result.result())


@storage_object_router.get("/by-key/{key:path}", response_model=StorageObjectResponse)
async def get_storage_object_by_key(
    request: Request,
    key: str,
    _: None = Depends(AuthDependency.auth_dependency),
) -> StorageObjectResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result: Result[StorageObjectRow] = await Storage.get_object_from_key_async(
        session=session, key=key
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting storage object by key. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(),
            detail=a_result.message(),
        )
    return StorageObjectResponse.from_row(a_result.result())


@router.delete("/{public_id}", response_model=OkResponse)
async def delete_storage_object(
    request: Request,
    public_id: str,
    _: None = Depends(AuthDependency.auth_dependency),
) -> OkResponse:
    """Delete an S3 object and its storage metadata."""
    session = DBSessionMiddleware.get_session(request=request)
    found = await Storage.get_object_from_public_id_async(session, public_id)
    if found.is_not_ok():
        raise HTTPException(found.get_http_code(), found.message())
    result = await Storage.delete_object_async(session, found.result())
    if result.is_not_ok():
        raise HTTPException(result.get_http_code(), result.message())
    return OkResponse()
