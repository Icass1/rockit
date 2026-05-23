from __future__ import annotations

from logging import Logger
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

logger: Logger = getLogger(__name__)


class BaseProvider:
    _id: int
    _name: str

    def set_info(self, provider_id: int, provider_name: str):
        self._id = provider_id
        self._name = provider_name

    async def async_init(self, session: AsyncSession):
        logger.debug(f"Provider {self} does not implement async_init")

    def get_id(self) -> AResult[int]:
        try:
            return AResult(code=AResultCode.OK, message="OK", result=self._id)
        except:
            logger.error("Error getting provider id.")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting provider id"
            )

    def get_name(self):
        return self._name
