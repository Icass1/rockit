from __future__ import annotations

from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


class BaseProvider:
    _id: int
    _name: str

    def set_info(self, provider_id: int, provider_name: str) -> None:
        self._id = provider_id
        self._name = provider_name

    async def async_init(self, session: AsyncSession) -> None:
        logger.debug(f"Provider {self} does not implement async_init")

    def get_id(self) -> Result[int]:
        try:
            return Result(code=ResultCode.OK, message="OK", result=self._id)
        except Exception:
            logger.error("Error getting provider id.")
            return Result(code=ResultCode.GENERAL_ERROR, message="Error getting provider id")

    def get_name(self) -> str:
        return self._name

    async def check_health_async(self) -> ResultCode:
        """Check optional provider prerequisites without preventing API startup."""
        return ResultCode(code=ResultCode.OK, message="OK")

    def download_concurrency_limit(self) -> int:
        return 2

    def download_cooldown_remaining(self) -> float:
        return 0.0
