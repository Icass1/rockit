import functools
from collections.abc import Awaitable, Callable
from typing import ParamSpec, TypeVar, overload

from sqlalchemy.ext.asyncio import AsyncSession

from core.aResult import AResult, AResultCode
from logger import getLogger

T = TypeVar("T")
P = ParamSpec("P")

logger = getLogger(__name__)


@overload
def safe_async[**P, T](
    func: Callable[P, Awaitable[AResult[T]]],
) -> Callable[P, Awaitable[AResult[T]]]: ...


@overload
def safe_async[**P](
    func: Callable[P, Awaitable[AResultCode]],
) -> Callable[P, Awaitable[AResultCode]]: ...


def safe_async[**P, T](
    func: Callable[P, Awaitable[AResult[T] | AResultCode]],
) -> Callable[P, Awaitable[AResult[T] | AResultCode]]:

    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> AResult[T] | AResultCode:

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

            # Detect whether function returns AResult or AResultCode
            return_type = func.__annotations__.get("return")

            # Case 1: AResult[T]
            if return_type is not None and getattr(return_type, "__origin__", None) is AResult:
                return AResult[T](
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Error in {func.__name__}",
                )

            # Case 2: AResultCode
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error in {func.__name__}",
            )

    return wrapper
