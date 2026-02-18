from logging import Logger
from backend.utils.logger import getLogger


logger: Logger = getLogger(__name__)


class BaseProvider:
    _id: int

    def __init__(self) -> None:
        pass

    def set_id(self, provider_id: int):
        self._id = provider_id
