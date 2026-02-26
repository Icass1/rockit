from logging import Logger
from fastapi import HTTPException

from backend.core.aResult import AResult, AResultCode
from backend.core.access.userAccess import UserAccess
from backend.core.access.db.ormModels.user import UserRow
from backend.utils.logger import getLogger

logger: Logger = getLogger(name=__name__)


class Register:
    @staticmethod
    async def register_user_async(username: str, password: str) -> AResult[UserRow]:
        a_result_existing_user: AResult[UserRow] = (
            await UserAccess.get_user_from_username_async(username=username)
        )

        if (
            a_result_existing_user.code() != AResultCode.NOT_FOUND
            and a_result_existing_user.is_not_ok()
        ):
            logger.info(
                f"Error getting existing user in database. {a_result_existing_user.info()}"
            )
            raise HTTPException(
                status_code=a_result_existing_user.get_http_code(),
                detail=a_result_existing_user.message(),
            )

        a_result_user: AResult[UserRow] = await UserAccess.create_user_async(
            username=username, password=password
        )
        if a_result_user.is_not_ok():
            logger.info(f"Error creatinguser  in database. {a_result_user.info()}")
            raise HTTPException(
                status_code=a_result_user.get_http_code(),
                detail=a_result_user.message(),
            )

        return a_result_user
