from logging import Logger

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.user import UserRow
from core.access.userAccess import UserAccess
from core.models.navigationPin import DEFAULT_NAVIGATION_LISTS
from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(name=__name__)


class Register:
    @staticmethod
    async def register_user_async(
        session: AsyncSession, username: str, password: str
    ) -> Result[UserRow]:
        a_result_existing_user: Result[UserRow] = await UserAccess.get_user_from_username_async(
            session, username=username
        )

        if (
            a_result_existing_user.code() != ResultCode.NOT_FOUND
            and a_result_existing_user.is_not_ok()
        ):
            logger.info(f"Error getting existing user in database. {a_result_existing_user.info()}")
            raise HTTPException(
                status_code=a_result_existing_user.get_http_code(),
                detail=a_result_existing_user.message(),
            )

        a_result_user: Result[UserRow] = await UserAccess.create_user_async(
            session=session,
            username=username,
            password=password,
            navigation_defaults=list(DEFAULT_NAVIGATION_LISTS),
        )
        if a_result_user.is_not_ok():
            logger.info(f"Error creatinguser  in database. {a_result_user.info()}")
            raise HTTPException(
                status_code=a_result_user.get_http_code(),
                detail=a_result_user.message(),
            )

        logger.info(f"User {username} created successfully.")

        return a_result_user
