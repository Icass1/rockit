from typing import TypeVar

T = TypeVar("T")
from fastapi import HTTPException
from backend.core.aResult import AResult
from backend.utils.logger import getLogger

logger = getLogger(__name__)


def value_or_error(result: AResult[T]) -> T:
    if result.is_not_ok():
        logger.error(result.info())
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()
