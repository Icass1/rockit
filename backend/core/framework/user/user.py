from backend.core.access.userAccess import UserAccess
from backend.core.responses.queueResponse import QueueResponse


class User:

    @staticmethod
    def get_user_queue(user_id: int) -> QueueResponse:

        return UserAccess.get_queue(user_id)
