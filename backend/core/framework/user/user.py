from backend.core.responses.queueResponse import QueueResponse


class User:

    @staticmethod
    def get_user_queue(user_id: int) -> QueueResponse:

        raise NotImplementedError()
