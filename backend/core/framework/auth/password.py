from passlib.context import CryptContext

from backend.core.aResult import AResult, AResultCode
from backend.core.access.userAccess import UserAccess
from backend.core.access.db.ormModels.user import UserRow
from backend.utils.logger import getLogger

logger = getLogger(__name__)

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


class Password:
    @staticmethod
    async def verify_password(plain: str, hashed: str) -> bool:
        return pwd.verify(plain, hashed)

    @staticmethod
    async def login_user_async(username: str, password: str) -> AResult[UserRow]:
        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_username_async(
            username
        )

        if a_result_user.is_not_ok():
            logger.error(f"Error getting user from username. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()

        if not user.password_hash:
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Password has is None."
            )

        if not await Password.verify_password(password, user.password_hash):
            return AResult(code=AResultCode.BAD_REQUEST, message="Invalid credentials")

        return AResult(code=AResultCode.OK, message="OK", result=user)
