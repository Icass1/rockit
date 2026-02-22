from backend.core.aResult import AResult, AResultCode
from backend.core.responses.queueResponse import QueueResponse


class User:

    @staticmethod
    def get_user_queue(user_id: int) -> AResult[QueueResponse]:

        return AResult(code=AResultCode.NOT_IMPLEMENTED, message="Get user queue is not implemented")
