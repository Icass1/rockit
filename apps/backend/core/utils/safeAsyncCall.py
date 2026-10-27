import functools
from collections.abc import Awaitable, Callable
from typing import ParamSpec, TypeVar, overload

from sqlalchemy.ext.asyncio import AsyncSession

from logger import logger
from result import Result, ResultCode

T = TypeVar("T")
P = ParamSpec("P")


@overload
def safe_async[**P, T](
    func: Callable[P, Awaitable[Result[T]]],
) -> Callable[P, Awaitable[Result[T]]]: ...


@overload
def safe_async[**P](
    func: Callable[P, Awaitable[ResultCode]],
) -> Callable[P, Awaitable[ResultCode]]: ...


def safe_async[**P, T](
    func: Callable[P, Awaitable[Result[T] | ResultCode]],
) -> Callable[P, Awaitable[Result[T] | ResultCode]]:

    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> Result[T] | ResultCode:

        try:
            return await func(*args, **kwargs)

        except Exception as e:
            # logger.exception(f"Exception in {func.__name__}: {e}")
            logger.error(f"Exception in {func.__name__}: {e}")

            # Roll back session to prevent cascading InFailedSQLTransactionError
            for arg in list(args) + list(kwargs.values()):
                if isinstance(arg, AsyncSession):
                    try:
                        await arg.rollback()
                    except Exception:
                        pass
                    break

            # Detect whether function returns Result or ResultCode
            return_type = func.__annotations__.get("return")

            # Case 1: Result[T]
            if return_type is not None and getattr(return_type, "__origin__", None) is Result:
                return Result[T](
                    code=ResultCode.GENERAL_ERROR,
                    message=f"Error in {func.__name__}",
                )

            # Case 2: ResultCode
            return ResultCode(
                code=ResultCode.GENERAL_ERROR,
                message=f"Error in {func.__name__}",
            )

    return wrapper
