from argon2 import PasswordHasher
from fastapi import APIRouter, Response
from logging import Logger


from backend.framework.auth.password import login_user
from backend.framework.auth.register import register_user
from backend.framework.auth.sessions import create_session

from backend.utils.logger import getLogger

from backend.db.ormModels.main.user import UserRow


from backend.requests.logInRequest import LoginRequest
from backend.requests.registerRequest import RegisterRequest

from backend.responses.registerResponse import RegisterResponse
from backend.responses.loginResponse import LoginResponse

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
    create_session(response=response, user_id=user.id)
    return LoginResponse(user_id=user.public_id)


@router.post("/register")
async def register(
    response: Response,
    payload: RegisterRequest
) -> RegisterResponse:
    user: UserRow = await register_user(username=payload.username, password=payload.password)
    create_session(response=response, user_id=user.id)
    return RegisterResponse(user_id=user.public_id)
