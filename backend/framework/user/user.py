from backend.access.userAccess import UserAccess
from backend.responses.queueResponse import QueueResponse


class User:

    @staticmethod
    def get_user_queue(user_id: int) -> QueueResponse:

        return UserAccess.get_queue(user_id)
