from pydantic import BaseModel


class SendToUser:
    @staticmethod
    async def send_to_user(user_id: int, message: BaseModel | dict[str, object]) -> None:
        from core.framework.websocket.webSocketManager import ws_manager

        print(user_id, message)

        await ws_manager.send_to_user_async(user_id=user_id, message=message)
