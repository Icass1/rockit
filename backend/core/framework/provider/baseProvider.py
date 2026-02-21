print(__file__)  # nopep8

from logging import Logger
from backend.core.aResult import AResult, AResultCode
from backend.utils.logger import getLogger


logger: Logger = getLogger(__name__)


class BaseProvider:
    _id: int

    def __init__(self) -> None:
        pass

    def set_id(self, provider_id: int):
        self._id = provider_id

    async def async_init(self):
        pass

    def get_id(self) -> AResult[int]:
        try:
            return AResult(AResultCode.OK, "OK", self._id)
        except:
            logger.error("Error getting provider id.")
            return AResult(AResultCode.GENERAL_ERROR, "Error getting provider id")
