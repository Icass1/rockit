import asyncio
from functools import wraps
import inspect
from fastapi import APIRouter, FastAPI


def fast_api_route(app: FastAPI | APIRouter, path: str):
    """
    Decorator to register a GET route in FastAPI and set the asyncio task name.
    Supports both async and sync route handlers.
    """
    def decorator(func):
        is_coroutine = inspect.iscoroutinefunction(func)

        @wraps(func)
        async def wrapper(*args, **kwargs):
            task = asyncio.current_task()
            if task:
                task.set_name(f"get - {path}")

            if is_coroutine:
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)

        app.get(path)(wrapper)
        return wrapper

    return decorator
