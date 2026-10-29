import inspect
import time
from collections.abc import Callable
from functools import wraps
from typing import ParamSpec, TypeVar

from logger import getLogger

logger = getLogger(__name__)


T = TypeVar("T")
P = ParamSpec("P")


def time_it[**P, T](func: Callable[P, T]) -> Callable[P, T]:
    # Get file and line number once at decoration time
    file = inspect.getsourcefile(func)
    line = inspect.getsourcelines(func)[1]

    if inspect.iscoroutinefunction(func):

        @wraps(func)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()
            result = await func(*args, **kwargs)
            duration = round(time.time() - start, 3)
            logger.debug(f"[{file}:{line}] {func.__name__} took {duration}s")
            return result

        return async_wrapper  # type: ignore

    else:

        @wraps(func)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            start = time.time()
            result = func(*args, **kwargs)
            duration = round(time.time() - start, 3)
            logger.info(f"[{file}:{line}] {func.__name__} took {duration}s")
            return result

        return sync_wrapper
