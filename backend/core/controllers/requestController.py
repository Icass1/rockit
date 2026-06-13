from logging import Logger

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id
from backend.core.aResult import AResult
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.access.db.ormModels.user import UserRow
from backend.core.framework.admin.userRequest import UserRequest
from backend.core.requests.userRequestRequest import CreateUserRequestRequest
from backend.core.responses.userRequestResponse import (
    UserRequestResponse,
    UserRequestListResponse,
)

logger: Logger = getLogger(__name__)

router = APIRouter(
    prefix="/request",
    tags=["Request"],
)


@router.post("")
async def create_request(
    request: Request,
    payload: CreateUserRequestRequest,
    _=Depends(dependency=AuthMiddleware.auth_dependency),
) -> UserRequestResponse:
    """Submit a new suggestion/request."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )

    user: UserRow = a_result_user.result()

    public_id = create_id(32)
    a_result = await UserRequest.create_request_async(
        session=session,
        user_id=user.id,
        public_id=public_id,
        request_type=payload.requestType,
        proposed_value=payload.proposedValue,
        media_public_id=payload.mediaPublicId,
        comment=payload.comment,
    )

    if a_result.is_not_ok():
        logger.error(f"Error creating request. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.get("")
async def get_my_requests(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    _=Depends(dependency=AuthMiddleware.auth_dependency),
) -> UserRequestListResponse:
    """Get current user's requests."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(),
            detail=a_result_user.message(),
        )

    user: UserRow = a_result_user.result()
    a_result = await UserRequest.get_user_requests_async(
        session=session, user_id=user.id, limit=limit, offset=offset
    )

    if a_result.is_not_ok():
        logger.error(f"Error getting requests. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()
