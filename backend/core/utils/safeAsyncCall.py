from typing import TypeVar, ParamSpec, Awaitable, Callable
import functools

from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger

T = TypeVar("T")
P = ParamSpec("P")

logger = getLogger(__name__)


def safe_async(
    func: Callable[P, Awaitable[AResult[T]]],
) -> Callable[P, Awaitable[AResult[T]]]:
    """Wrap an async function to catch exceptions and return a generic AResult error."""

    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> AResult[T]:
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.exception(f"Exception in {func.__name__}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error in {func.__name__}: {e}",
            )

    return wrapper
