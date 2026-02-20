from argon2 import PasswordHasher
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from logging import Logger


from backend.core.aResult import AResult, AResultCode
from backend.core.framework.auth.password import login_user
from backend.core.framework.auth.register import register_user
from backend.core.framework.auth.sessions import Session

from backend.core.middlewares.authMiddleware import AuthMiddleware
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
async def login(response: Response, payload: LoginRequest) -> LoginResponse:
    user: UserRow = await login_user(username=payload.username, password=payload.password)
    Session.create_session(response=response, user_id=user.id)
    return LoginResponse(userId=user.public_id)


@router.post("/register")
async def register(
    response: Response,
    payload: RegisterRequest
) -> RegisterResponse:
    user: UserRow = await register_user(username=payload.username, password=payload.password)

    Session.create_session(response=response, user_id=user.id)

    return RegisterResponse(userId=user.public_id)


@router.get(path="/logout")
def logout_user(request: Request, _=Depends(AuthMiddleware.auth_dependency)) -> OkResponse:

    a_result_session_id: AResult[str] = AuthMiddleware.get_current_session_id(
        request=request)

    if a_result_session_id.is_not_ok():
        logger.error("Error getting current session id.")
        raise HTTPException(
            status_code=a_result_session_id.get_http_code(),
            detail=a_result_session_id.message()
        )

    a_result_code: AResultCode = Session.end_session(
        session_id=a_result_session_id.result())
    if a_result_code.is_not_ok():
        logger.error("Error ending user session.")
        raise HTTPException(
            status_code=a_result_code.get_http_code(),
            detail=a_result_code.message()
        )

    return OkResponse()
