from typing import TypeVar, ParamSpec, Awaitable, Callable, Union, overload
import functools

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

T = TypeVar("T")
P = ParamSpec("P")

logger = getLogger(__name__)


@overload
def safe_async(
    func: Callable[P, Awaitable[AResult[T]]],
) -> Callable[P, Awaitable[AResult[T]]]: ...


@overload
def safe_async(
    func: Callable[P, Awaitable[AResultCode]],
) -> Callable[P, Awaitable[AResultCode]]: ...


def safe_async(
    func: Callable[P, Awaitable[Union[AResult[T], AResultCode]]],
) -> Callable[P, Awaitable[Union[AResult[T], AResultCode]]]:

    @functools.wraps(func)
    async def wrapper(
        *args: P.args, **kwargs: P.kwargs
    ) -> Union[AResult[T], AResultCode]:

        try:
            return await func(*args, **kwargs)

        except Exception as e:
            logger.exception(f"Exception in {func.__name__}: {e}")

            # Detect whether function returns AResult or AResultCode
            return_type = func.__annotations__.get("return")

            # Case 1: AResult[T]
            if (
                return_type is not None
                and getattr(return_type, "__origin__", None) is AResult
            ):
                return AResult[T](
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Error in {func.__name__}: {e}",
                )

            # Case 2: AResultCode
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error in {func.__name__}: {e}",
            )

    return wrapper
