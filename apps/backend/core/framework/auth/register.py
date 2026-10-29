from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.user import UserRow
from core.access.userAccess import UserAccess
from core.framework import providers
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
            logger.error(
                f"Error getting existing user in database. {a_result_existing_user.info()}"
            )
            return Result(
                code=a_result_existing_user.code(), message=a_result_existing_user.message()
            )

        shortcuts = providers.get_navigation_shortcuts()
        if shortcuts.is_not_ok():
            logger.error(f"Error resolving registration shortcuts: {shortcuts.info()}")
            return Result(code=shortcuts.code(), message=shortcuts.message())
        a_result_user: Result[UserRow] = await UserAccess.create_user_async(
            session=session,
            username=username,
            password=password,
            navigation_defaults=[
                shortcut.key for shortcut in shortcuts.result().values() if shortcut.default
            ],
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error creating user in database. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        logger.info(f"User {username} created successfully.")

        return a_result_user
