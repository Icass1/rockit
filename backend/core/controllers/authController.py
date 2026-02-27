from argon2 import PasswordHasher
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.auth.password import Password
from backend.core.framework.auth.register import Register
from backend.core.framework.auth.session import Session
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.utils.logger import getLogger

from backend.core.access.db.ormModels.user import UserRow

from backend.core.requests.logInRequest import LoginRequest
from backend.core.requests.registerRequest import RegisterRequest

from backend.core.responses.okResponse import OkResponse
from backend.core.responses.registerResponse import RegisterResponse
from backend.core.responses.loginResponse import LoginResponse

ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
)

logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/auth")


@router.post("/login")
async def login(
    request: Request, response: Response, payload: LoginRequest
) -> LoginResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user: AResult[UserRow] = await Password.login_user_async(
        session=session, username=payload.username, password=payload.password
    )
    if a_result_user.is_not_ok():
        logger.error(f"Error loging in user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    a_result_session: AResultCode = await Session.create_session_async(
        session=session, response=response, user_id=user.id
    )
    if a_result_session.is_not_ok():
        logger.error(f"Error creating session. {a_result_session.info()}")
        raise HTTPException(
            status_code=a_result_session.code(), detail=a_result_session.message()
        )

    return LoginResponse(userId=user.public_id)


@router.post("/register")
async def register(
    request: Request, response: Response, payload: RegisterRequest
) -> RegisterResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = await Register.register_user_async(
        session=session, username=payload.username, password=payload.password
    )
    if a_result_user.is_not_ok():
        logger.error(f"Error registering user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()

    a_result_session = await Session.create_session_async(
        session=session, response=response, user_id=user.id
    )
    if a_result_session.is_not_ok():
        logger.error(f"Error creating session. {a_result_session.info()}")
        raise HTTPException(
            status_code=a_result_session.code(), detail=a_result_session.message()
        )

    return RegisterResponse(userId=user.public_id)


@router.get(path="/logout")
async def logout_user(
    request: Request, _=Depends(AuthMiddleware.auth_dependency)
) -> OkResponse:
    a_result_session_id: AResult[str] = AuthMiddleware.get_current_session_id(
        request=request
    )

    if a_result_session_id.is_not_ok():
        logger.error("Error getting current session id.")
        raise HTTPException(
            status_code=a_result_session_id.get_http_code(),
            detail=a_result_session_id.message(),
        )

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_code: AResultCode = await Session.end_session_async(
        session=session, session_id=a_result_session_id.result()
    )
    if a_result_code.is_not_ok():
        logger.error("Error ending user session.")
        raise HTTPException(
            status_code=a_result_code.get_http_code(), detail=a_result_code.message()
        )

    return OkResponse()
